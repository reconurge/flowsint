import json
import random
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

    # 1. Requête pour les 50 premiers nœuds du sketch
    nodes_query = """
    MATCH (n)
    WHERE n.sketch_id = $sketch_id
    RETURN elementId(n) as id, labels(n) as labels, properties(n) as data
    LIMIT 50
    """
    nodes_result = neo4j_connection.query(nodes_query, parameters={"sketch_id": sketch_id})

    node_ids = [record["id"] for record in nodes_result]

    # 2. Requête pour les relations uniquement entre ces nœuds
    rels_query = """
    UNWIND $node_ids AS nid
    MATCH (a)-[r]->(b)
    WHERE elementId(a) = nid AND elementId(b) IN $node_ids
    RETURN elementId(r) as id, type(r) as type, elementId(a) as source, elementId(b) as target, properties(r) as data
    """
    rels_result = neo4j_connection.query(rels_query, parameters={"node_ids": node_ids})

    # 3. Formater les nœuds
    nodes = [
        {
            "id": str(record["id"]),
            "labels": record["labels"],
            "data": {
                "label": record["data"].get("domain", "Node"),
                "type": record["labels"][0].lower(),
            },
            "label": record["data"].get("domain", "Node"),
            "type": record["labels"][0].lower(),
            "caption": record["data"].get("domain", "Node"),
            "size": 40,
            "color": get_label_color(record["labels"][0] if record["labels"] else "default"),
            "x": random.random() * 1000,
            "y": random.random() * 1000
        }
        for record in nodes_result
    ]

    # 4. Formater les relations
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

    return {"nodes": nodes, "rels": rels}

# Fonction pour attribuer des couleurs en fonction des labels
def get_label_color(label: str) -> str:
    color_map = {
        'subdomain': '#A5ABB6',
        'domain': '#68BDF6',
        'default': '#A5ABB6'
    }
    
    return color_map.get(label, color_map["default"])


from pydantic import BaseModel
from typing import List, Dict, Any

class Node(BaseModel):
    id: str
    data: Dict[str, Any]
    type: str  # ex: "domain", "email", etc.
    position: Dict[str, float]  # x, y

class Edge(BaseModel):
    id: str
    from_: str  # "from" est un mot réservé, donc on utilise from_ en Python
    to: str
    type: str
    data: Dict[str, Any]

class SketchPayload(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

    
@app.post("/sketch/{sketch_id}/save")
async def save_sketch(sketch_id: str, payload: SketchPayload):
    try:
        # 1. Supprimer tous les nœuds et relations du sketch
        delete_query = """
        MATCH (n)
        WHERE n.sketch_id = $sketch_id
        DETACH DELETE n
        """
        neo4j_connection.query(delete_query, parameters={"sketch_id": sketch_id})

        # 2. Créer les nouveaux nœuds
        for node in payload.nodes:
            node_query = """
            CREATE (n:$label)
            SET n += $props
            SET n.sketch_id = $sketch_id
            SET n.id = $id
            """
            neo4j_connection.query(
                node_query,
                parameters={
                    "label": node.type.capitalize(),
                    "props": node.data,
                    "id": node.id,
                    "sketch_id": sketch_id
                }
            )

        # 3. Créer les relations
        for edge in payload.edges:
            edge_query = """
            MATCH (a), (b)
            WHERE a.id = $from AND b.id = $to AND a.sketch_id = $sketch_id AND b.sketch_id = $sketch_id
            CREATE (a)-[r:$rel_type]->(b)
            SET r += $props
            SET r.sketch_id = $sketch_id
            SET r.id = $id
            """
            neo4j_connection.query(
                edge_query,
                parameters={
                    "from": edge.from_,
                    "to": edge.to,
                    "rel_type": edge.type.upper(),
                    "props": edge.data,
                    "id": edge.id,
                    "sketch_id": sketch_id
                }
            )

        return {"status": "success", "message": "Sketch saved."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Neo4j error: {str(e)}")
