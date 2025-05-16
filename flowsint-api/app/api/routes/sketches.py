from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Literal
from fastapi import HTTPException
from pydantic import BaseModel, Field
from app.utils import flatten
from typing import Dict, Any
from app.neo4j.connector import Neo4jConnection
import os
from dotenv import load_dotenv


load_dotenv()

URI = os.getenv("NEO4J_URI_BOLT")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)


router = APIRouter()

@router.get("/sketch/{sketch_id}/nodes")
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
        }
        for record in rels_result
    ]

    return {"nds": nodes, "rls": rels}


class NodeInput(BaseModel):
    type: str
    data: Dict[str, Any] = Field(default_factory=dict)

def dict_to_cypher_props(props: dict, prefix: str = "") -> str:
    return ", ".join(f"{key}: ${prefix}{key}" for key in props)

# Endpoints
@router.get("/sketches")
def read_root():
    return {"message": "Sketches API is running"}


@router.post("/sketch/{sketch_id}/nodes/add")
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

class RelationInput(BaseModel):
    source: Any
    target: Any
    type: Literal["one-way", "two-way"]
    label: str = "RELATED_TO"  # Optionnel : nom de la relation

@router.post("/sketch/{sketch_id}/relations/add")
def add_edge(sketch_id: str, relation: RelationInput):

    query = f"""
        MATCH (a) WHERE elementId(a) = $from_id
        MATCH (b) WHERE elementId(b) = $to_id
        MERGE (a)-[r:`{relation.label}` {{sketch_id: $sketch_id}}]->(b)
        RETURN r
    """

    params = {
        "from_id": relation.source["id"],
        "to_id": relation.target["id"],
        "sketch_id": sketch_id,
    }

    try:
        result = neo4j_connection.query(query, params)
    except Exception as e:
        print(f"Edge creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create edge")
    print(result)
    if not result:
        raise HTTPException(status_code=400, detail="Edge creation failed")

    return {
        "status": "edge added",
        "edge": result[0]["r"],
    }
    
