import json
from uuid import UUID
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from app.core.db import get_db
from app.scanners.registry import ScannerRegistry
from app.core.auth import get_current_user
from app.utils import extract_input_schema, neo4j_to_xy
from app.core.celery import celery_app 
from app.types.domain import MinimalDomain
from app.types.ip import MinimalIp
from typing import List
from app.neo4j.connector import Neo4jConnection
from fastapi import Query
import os
from dotenv import load_dotenv
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

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
    ]

    flattened_scanners["inputs"] = object_inputs

    return {"items": flattened_scanners}


class LaunchTransformPayload(BaseModel):
    values: List[str]
    
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
        
        task = celery_app.send_task("run_transform", args=[response.data["transform_schema"], payload.values, None])
        return {"id": task.id}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Transform not found")

    
@app.get("/sketch/{sketch_id}/nodes")
async def get_sketch_nodes(sketch_id: str):
    # Récupération des nœuds
    nodes_query = """
    MATCH (n)
    WHERE n.sketch_id = $sketch_id
    RETURN n, labels(n) as node_types
    """
    nodes_result = neo4j_connection.query(nodes_query, parameters={"sketch_id": sketch_id})
    
    # Récupération des relations
    edges_query = """
    MATCH (a)-[r]->(b)
    WHERE r.sketch_id = $sketch_id
    RETURN a.id as source, b.id as target, type(r) as type, r as properties
    """
    edges_result = neo4j_connection.query(edges_query, parameters={"sketch_id": sketch_id})
    
    # Transformation des résultats au format React Flow
    nodes = []
    for record in nodes_result:
        node_data = record["n"]
        node_type = record["node_types"][0] if record["node_types"] else "default"
        
        # Format standard pour React Flow
        node = {
            "id": node_data["id"],
            "type": node_type,
            "data": {
                "label": node_data.get("label", ""),
                **{k: v for k, v in node_data.items() if k not in ["position_x","sketch_id", "position_y"]}
            },
            "position": {
                "x": float(node_data.get("position_x", 0)),
                "y": float(node_data.get("position_y", 0))
            }
        }
        nodes.append(node)
    
    edges = []
    for record in edges_result:
        # Format standard pour React Flow
        edge = {
            "id": f"{record['source']}-{record['target']}",
            "source": record["source"],
            "target": record["target"],
            "type": record["type"],
            "data": {k: v for k, v in record["properties"].items() if k != "sketch_id"}
        }
        edges.append(edge)
    
    return {"nodes": nodes, "edges": edges}


class Node(BaseModel):
    id: str
    type: str
    label: Optional[str] = None
    data: Dict[str, str] = Field(default_factory=dict)

class Edge(BaseModel):
    source: str
    target: str
    type: str
    data: Dict[str, str] = Field(default_factory=dict)
    
class SketchPayload(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    
@app.post("/sketch/{sketch_id}/save")
async def save_sketch(sketch_id: str, payload: SketchPayload):
    now = datetime.utcnow().isoformat()

    try:
        for node in payload.nodes:
            type = node.data.get('type', "individual")
            if type == "individual":
                first_name = node.data.get("first_name", "")
                last_name = node.data.get("last_name", "")
                node_label = f"{first_name} {last_name}".strip()
            elif type == "organization":
                node_label = node.data.get("name", "")
            else:
                node_label = node.label or f"{node.type}_{node.id[:8]}"
            
            position_x = 0
            position_y = 0
            
            if "position" in node.data:
                position = node.data.pop("position", {})  # Retirer position de data
                position_x = position.get("x", 0)
                position_y = position.get("y", 0)
            
            query = f"""
            MERGE (n:{node.type} {{id: $id}})
            SET n += $props,
                n.id = $id,
                n.label = $label,
                n.position_x = $position_x,
                n.position_y = $position_y,
                n.sketch_id = $sketch_id,
                n.updated_at = $now
            """
            neo4j_connection.query(query, parameters={
                "id": node.id,
                "props": node.data,
                "label": node_label,
                "position_x": position_x,
                "position_y": position_y,
                "sketch_id": sketch_id,
                "now": now
            })

        for edge in payload.edges:
            query = f"""
            MATCH (a {{id: $source}}), (b {{id: $target}})
            MERGE (a)-[r:{edge.type}]->(b)
            SET r += $props,
                r.sketch_id = $sketch_id,
                r.updated_at = $now
            """
            neo4j_connection.query(query, parameters={
                "source": edge.source,
                "target": edge.target,
                "props": edge.data,
                "sketch_id": sketch_id,
                "now": now
            })

        return {"saved": True, "last_saved_at": now}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))