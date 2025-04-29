import json
from uuid import UUID
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from app.core.db import get_db
from app.scanners.registry import ScannerRegistry
from app.core.auth import get_current_user
from app.utils import extract_input_schema, neo4j_to_cytoscape
from app.core.celery import celery_app 
from app.types.domain import MinimalDomain
from app.types.ip import MinimalIp
from typing import List
from app.neo4j.connector import Neo4jConnection
from fastapi import Query
import os
from dotenv import load_dotenv
from faker import Faker
import random
from uuid import uuid4
from typing import List, Dict
from decimal import Decimal
from app.populate import generate_random_sketch
load_dotenv()

URI = os.getenv("NEO4J_URI_BOLT")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

app = FastAPI()
neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)

    
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
    transform_id: UUID,
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

    
@app.get("/sketch/nodes")
async def get_sketch_nodes(limit: int = Query(10, ge=1), offset: int = Query(0, ge=0)):
    query = """
    MATCH (a)-[r]->(b) RETURN a, r, b;
    """
    result = neo4j_connection.query(query, parameters={"limit": limit, "offset": offset})
    
    if not result:
        raise HTTPException(status_code=404, detail="No nodes found for this sketch")
    
    return neo4j_to_cytoscape(result)

@app.get("/health")
async def health():
    return {"status": "ok"}


fake = Faker()

def to_serializable(d):
    """Convertit les valeurs Decimal en float dans les dictionnaires"""
    return {
        k: float(v) if isinstance(v, Decimal) else v
        for k, v in d.items()
    }
    
@app.get("/investigation/generate")
async def populate():
   generate_random_sketch()