import json
import random
from uuid import UUID
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List
from app.core.db import get_db
from app.scanners.registry import ScannerRegistry
from app.core.auth import get_current_user
from app.utils import extract_input_schema, flatten
from app.core.celery import celery_app 
from app.types.domain import MinimalDomain
from app.types.ip import MinimalIp
from app.types.social import MinimalSocial
from app.types.organization import MinimalOrganization
from app.types.email import Email
from typing import List, Dict, Any
from app.neo4j.connector import Neo4jConnection
import os
from dotenv import load_dotenv
from typing import List
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

URI = os.getenv("NEO4J_URI_BOLT")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://app.flowsint.localhost",
    "https://app.flowsint.localhost",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]



app = FastAPI()
neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Ou ["*"] pour tout autoriser en dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/scanners")
async def get_scans_list():
    return {"scanners": ScannerRegistry.list()}

@app.get("/transforms/nodes")
async def get_scans_list():
    scanners = ScannerRegistry.list_by_category()
    # Flatten scanner nodes
    flattened_scanners = {
        category: [
            {
                "class_name": scanner["class_name"],
                "name": scanner["name"],
                "module": scanner["module"],
                "doc": scanner["doc"],
                "inputs": scanner["inputs"],
                "outputs": scanner["outputs"],
                "type": "scanner"
            }
            for scanner in scanner_list
        ]
        for category, scanner_list in scanners.items()
    }

    # Add your object types under a dedicated category (e.g., "types")
    object_inputs = [
        extract_input_schema("MinimalDomain", MinimalDomain),
        extract_input_schema("MinimalIp", MinimalIp),
        extract_input_schema("MinimalSocial", MinimalSocial),
        extract_input_schema("Email", Email),
        extract_input_schema("MinimalOrganization", MinimalOrganization)
    ]

    flattened_scanners["inputs"] = object_inputs

    return {"items": flattened_scanners}


class LaunchTransformPayload(BaseModel):
    values: List[str]
    sketch_id: str
    
@app.post("/transforms/{transform_id}/launch")
async def launch_transform(
    transform_id: str,
    payload: LaunchTransformPayload,
    user=Depends(get_current_user)
):
    db = get_db()
    try:
        response = db.table("transforms").select("*").eq("id", str(transform_id)).single().execute()
        if response.data is None:
            raise HTTPException(status_code=404, detail="Transform not found")
        
        task = celery_app.send_task("run_transform", args=[response.data["transform_schema"], payload.values, payload.sketch_id])
        return {"id": task.id}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Transform not found")

    
@app.get("/sketch/{sketch_id}/nodes")
async def get_sketch_nodes(sketch_id: str):
    import random

    nodes_query = """
    MATCH (n)
    WHERE n.sketch_id = $sketch_id
    RETURN elementId(n) as id, labels(n) as labels, properties(n) as data
    LIMIT 500
    """
    nodes_result = neo4j_connection.query(nodes_query, parameters={"sketch_id": sketch_id})

    node_ids = [record["id"] for record in nodes_result]

    rels_query = """
    UNWIND $node_ids AS nid
    MATCH (a)-[r]->(b)
    WHERE elementId(a) = nid AND elementId(b) IN $node_ids
    RETURN elementId(r) as id, type(r) as type, elementId(a) as source, elementId(b) as target, properties(r) as data
    """
    rels_result = neo4j_connection.query(rels_query, parameters={"node_ids": node_ids})

    nodes = [
        {
            "id": str(record["id"]),
            "labels": record["labels"],
            "data": record["data"],
            "label": record["data"].get("label", "Node"),
            "type": record["labels"][0].lower(),
            "caption": record["data"].get("label", "Node"),
            "size": 40,
            "color": record["data"].get("color", "#FFFFFF"),
            "x": random.random() * 1000,
            "y": random.random() * 1000
        }
        for record in nodes_result
    ]

    rels = [
        {
            "id": str(record["id"]),
            "type": record["type"],
            "from": str(record["source"]),
            "to": str(record["target"]),
            "data": record["data"],
            "caption": record["type"],
            "width": 1,
            "color": "#A5ABB6"
        }
        for record in rels_result
    ]

    return {"nds": nodes, "rls": rels}


class NodeInput(BaseModel):
    type: str
    data: Dict[str, Any] = Field(default_factory=dict)

def dict_to_cypher_props(props: dict) -> str:
    return ", ".join(f"{key}: ${key}" for key in props)

@app.post("/sketch/{sketch_id}/nodes/add")
def add_node(sketch_id: str, node: NodeInput):
    
    node_type = getattr(node, "type", "unknown")
    node_data = getattr(node, "data", {})

    properties = {
        "type": node_type,
        "sketch_id": sketch_id,
        "caption": node_data.get("label", "Node"),
        "label": node_data.get("label", "Node"),
        "color": node_data.get("color", "Node"),
        "size": 40,
    }

    if node_data and isinstance(node_data, dict):
        flattened_data = flatten(node_data)
        properties.update(flattened_data)

    cypher_props = dict_to_cypher_props(properties)

    create_query = f"""
        MERGE (d:`{node_type}` {{ {cypher_props} }})
        RETURN d as node
    """

    try:
        create_result = neo4j_connection.query(create_query, properties)
    except Exception as e:
        print(f"Query execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if not create_result:
        raise HTTPException(status_code=400, detail="Node creation failed - no result returned")

    try:
        new_node = create_result[0]["node"]
    except (IndexError, KeyError) as e:
        print(f"Error extracting node_id: {e}, result: {create_result}")
        new_node = None
    new_node["data"]=node_data

    return {
        "status": "node added",
        "node": new_node,
    }

class EdgeInput(BaseModel):
    from_node: dict
    to_node: dict
    type: str

@app.post("/sketch/{sketch_id}/edges/add")
def add_edge(sketch_id: str, edge: EdgeInput):
    from_props = flatten(edge.from_node)
    to_props = flatten(edge.to_node)

    from_cypher = dict_to_cypher_props(from_props)
    to_cypher = dict_to_cypher_props(to_props)

    query = f"""
        MATCH (a {{ {from_cypher} }})
        MATCH (b {{ {to_cypher} }})
        MERGE (a)-[r:`{edge.type}` {{sketch_id: $sketch_id}}]->(b)
        RETURN r
    """

    params = {
        **from_props,
        **to_props,
        "sketch_id": sketch_id,
    }

    try:
        result = neo4j_connection.query(query, params)
    except Exception as e:
        print(f"Edge creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create edge")

    if not result:
        raise HTTPException(status_code=400, detail="Edge creation failed")

    return {
        "status": "edge added",
        "edge": result[0]["r"],
    }