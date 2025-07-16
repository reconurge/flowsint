from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Literal
from fastapi import HTTPException
from pydantic import BaseModel, Field
from app.utils import flatten
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.api.schemas.sketch import SketchCreate, SketchRead, SketchUpdate
from app.models.models import Sketch, Profile
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.graph_db import neo4j_connection
from app.core.postgre_db import get_db
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/create", response_model=SketchRead, status_code=status.HTTP_201_CREATED)
def create_sketch(
    data: SketchCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    sketch_data = data.dict()
    sketch_data['owner_id'] = current_user.id
    sketch = Sketch(**sketch_data)
    db.add(sketch)
    db.commit()
    db.refresh(sketch)
    return sketch


@router.get("", response_model=List[SketchRead])
def list_sketches(db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    return db.query(Sketch).filter(Sketch.owner_id == current_user.id).all()

@router.get("/{sketch_id}")
def get_sketch_by_id(sketch_id: UUID, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    return sketch

@router.put("/{id}", response_model=SketchRead)
def update_sketch(id: UUID, data: SketchUpdate, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    sketch = db.query(Sketch).filter(Sketch.owner_id == current_user.id).get(id)
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(sketch, key, value)
    db.commit()
    db.refresh(sketch)
    return sketch

@router.delete("/{id}", status_code=204)
def delete_sketch(id: UUID, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    sketch = db.query(Sketch).filter(Sketch.id == id, Sketch.owner_id == current_user.id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    
    # Delete all nodes and relationships in Neo4j first
    neo4j_query = """
    MATCH (n {sketch_id: $sketch_id})
    DETACH DELETE n
    """
    try:
        neo4j_connection.query(neo4j_query, {"sketch_id": str(id)})
    except Exception as e:
        print(f"Neo4j cleanup error: {e}")
        raise HTTPException(status_code=500, detail="Failed to clean up graph data")
    
    # Then delete the sketch from PostgreSQL
    db.delete(sketch)
    db.commit()

@router.get("/{id}/graph")
async def get_sketch_nodes(id: str, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    sketch = db.query(Sketch).filter(Sketch.id == id, Sketch.owner_id == current_user.id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Graph not found")
    import random
    nodes_query = """
    MATCH (n)
    WHERE n.sketch_id = $sketch_id
    RETURN elementId(n) as id, labels(n) as labels, properties(n) as data
    LIMIT 100000
    """
    nodes_result = neo4j_connection.query(nodes_query, parameters={"sketch_id": id})

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
            "type": "custom",
            "caption": record["data"].get("label", "Node"),
            "position":{
                "x": random.random() * 1000,
                "y": random.random() * 1000,
            },
            "idx": idx
        }
        for idx, record in enumerate(nodes_result)
    ]

    rels = [
        {
            "id": str(record["id"]),
            "type": "straight",
            "source": str(record["source"]),
            "target": str(record["target"]),
            "data": record["data"],
            "caption": record["type"],
            # "label": record["type"].lower(),
        }
        for record in rels_result
    ]

    return {"nds": nodes, "rls": rels}

class NodeData(BaseModel):
    label: str = Field(default="Node", description="Label/name of the node")
    color: str = Field(default="Node", description="Color of the node")
    type: str = Field(default="Node", description="Type of the node")
    # Add any other specific data fields that might be common across nodes

    class Config:
        extra = "allow"  # Accept any additional fields

class NodeInput(BaseModel):
    type: str = Field(..., description="Type of the node")
    data: NodeData = Field(default_factory=NodeData, description="Additional data for the node")

def dict_to_cypher_props(props: dict, prefix: str = "") -> str:
    return ", ".join(f"{key}: ${prefix}{key}" for key in props)

@router.post("/{sketch_id}/nodes/add")
def add_node(sketch_id: str, node: NodeInput, current_user: Profile = Depends(get_current_user)):
    node_data = node.data.model_dump()
    
    node_type = node_data["type"]

    properties = {
        "type": node_type.lower(),
        "sketch_id": sketch_id,
        "caption": node_data["label"],
        "label": node_data["label"],
    }

    if node_data:
        flattened_data = flatten(node_data)
        properties.update(flattened_data)
    

    cypher_props = dict_to_cypher_props(properties)

    create_query = f"""
        MERGE (d:`{node_type}` {{ {cypher_props} }})
        RETURN d as node, elementId(d) as id
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
        new_node["id"] = create_result[0]["id"]
    except (IndexError, KeyError) as e:
        print(f"Error extracting node_id: {e}, result: {create_result}")
        raise HTTPException(status_code=500, detail="Failed to extract node data from response")
    
    new_node["data"] = node_data
    new_node["data"]["id"] = new_node["id"]

    return {
        "status": "node added",
        "node": new_node,
    }

class RelationInput(BaseModel):
    source: Any
    target: Any
    type: Literal["one-way", "two-way"]
    label: str = "RELATED_TO"  # Optionnel : nom de la relation

@router.post("/{sketch_id}/relations/add")
def add_edge(sketch_id: str, relation: RelationInput, current_user: Profile = Depends(get_current_user)):

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

    if not result:
        raise HTTPException(status_code=400, detail="Edge creation failed")

    return {
        "status": "edge added",
        "edge": result[0]["r"],
    }

class NodeDeleteInput(BaseModel):
    nodeIds: List[str]

class NodeEditInput(BaseModel):
    nodeId: str
    data: NodeData = Field(default_factory=NodeData, description="Updated data for the node")

@router.put("/{sketch_id}/nodes/edit")
def edit_node(
    sketch_id: str,
    node_edit: NodeEditInput,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    # First verify the sketch exists and belongs to the user
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    
    node_data = node_edit.data.model_dump()
    node_type = node_data.get("type", "Node")
    
    # Prepare properties to update
    properties = {
        "type": node_type.lower(),
        "caption": node_data.get("label", "Node"),
        "label": node_data.get("label", "Node"),
    }
    
    # Add any additional data from the flattened node_data
    if node_data:
        flattened_data = flatten(node_data)
        properties.update(flattened_data)
    
    # Build the SET clause for the Cypher query
    set_clause = ", ".join(f"n.{key} = ${key}" for key in properties.keys())
    
    query = f"""
        MATCH (n)
        WHERE elementId(n) = $node_id AND n.sketch_id = $sketch_id
        SET {set_clause}
        RETURN n as node
    """
    
    params = {
        "node_id": node_edit.nodeId,
        "sketch_id": sketch_id,
        **properties
    }
    
    try:
        result = neo4j_connection.query(query, params)
    except Exception as e:
        print(f"Node update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update node")
    
    if not result:
        raise HTTPException(status_code=404, detail="Node not found or not accessible")
    
    updated_node = result[0]["node"]
    updated_node["data"] = node_data
    
    return {
        "status": "node updated",
        "node": updated_node,
    }

@router.delete("/{sketch_id}/nodes")
def delete_nodes(
    sketch_id: str,
    nodes: NodeDeleteInput,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    # First verify the sketch exists and belongs to the user
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    
    # Delete nodes and their relationships
    query = """
    UNWIND $node_ids AS node_id
    MATCH (n)
    WHERE elementId(n) = node_id AND n.sketch_id = $sketch_id
    DETACH DELETE n
    """
    
    try:
        neo4j_connection.query(query, {
            "node_ids": nodes.nodeIds,
            "sketch_id": sketch_id
        })
    except Exception as e:
        print(f"Node deletion error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete nodes")
    
    return {"status": "nodes deleted", "count": len(nodes.nodeIds)}

@router.get("/{sketch_id}/nodes/{node_id}")
def get_related_nodes(
    sketch_id: str,
    node_id: str,
    db: Session = Depends(get_db),
    # current_user: Profile = Depends(get_current_user)
):
    # First verify the sketch exists and belongs to the user
    # sketch = db.query(Sketch).filter(Sketch.id == sketch_id, Sketch.owner_id == current_user.id).first()
    # if not sketch:
    #     raise HTTPException(status_code=404, detail="Sketch not found")
    
    # Query to get all direct relationships and connected nodes
    # First, let's get the center node
    center_query = """
    MATCH (n)
    WHERE elementId(n) = $node_id AND n.sketch_id = $sketch_id
    RETURN elementId(n) as id, labels(n) as labels, properties(n) as data
    """
    
    try:
        center_result = neo4j_connection.query(center_query, {
            "sketch_id": sketch_id,
            "node_id": node_id
        })
    except Exception as e:
        print(f"Center node query error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve center node")
    
    if not center_result:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Now get all relationships and connected nodes
    relationships_query = """
    MATCH (n)
    WHERE elementId(n) = $node_id AND n.sketch_id = $sketch_id
    OPTIONAL MATCH (n)-[r]->(other)
    WHERE other.sketch_id = $sketch_id
    OPTIONAL MATCH (other)-[r2]->(n)
    WHERE other.sketch_id = $sketch_id
    RETURN 
        elementId(r) as rel_id,
        type(r) as rel_type,
        properties(r) as rel_data,
        elementId(other) as other_node_id,
        labels(other) as other_node_labels,
        properties(other) as other_node_data,
        'outgoing' as direction
    UNION
    MATCH (n)
    WHERE elementId(n) = $node_id AND n.sketch_id = $sketch_id
    OPTIONAL MATCH (other)-[r]->(n)
    WHERE other.sketch_id = $sketch_id
    RETURN 
        elementId(r) as rel_id,
        type(r) as rel_type,
        properties(r) as rel_data,
        elementId(other) as other_node_id,
        labels(other) as other_node_labels,
        properties(other) as other_node_data,
        'incoming' as direction
    """
    
    try:
        result = neo4j_connection.query(relationships_query, {
            "sketch_id": sketch_id,
            "node_id": node_id
        })
    except Exception as e:
        print(f"Related nodes query error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve related nodes")
    
    # Extract center node info
    center_record = center_result[0]
    center_node = {
        "id": center_record["id"],
        "labels": center_record["labels"],
        "data": center_record["data"],
        "label": center_record["data"].get("label", "Node"),
        "type": "custom",
        "caption": center_record["data"].get("label", "Node")
    }
    
    # Collect all related nodes and relationships
    related_nodes = []
    relationships = []
    seen_nodes = set()
    seen_relationships = set()
    
    for record in result:
        # Skip if no relationship found
        if not record["rel_id"]:
            continue
            
        # Add relationship if not seen
        if record["rel_id"] not in seen_relationships:
            if record["direction"] == "outgoing":
                relationships.append({
                    "id": record["rel_id"],
                    "type": "straight",
                    "source": center_node["id"],
                    "target": record["other_node_id"],
                    "data": record["rel_data"],
                    "caption": record["rel_type"]
                })
            else:  # incoming
                relationships.append({
                    "id": record["rel_id"],
                    "type": "straight",
                    "source": record["other_node_id"],
                    "target": center_node["id"],
                    "data": record["rel_data"],
                    "caption": record["rel_type"]
                })
            seen_relationships.add(record["rel_id"])
        
        # Add related node if not seen
        if record["other_node_id"] and record["other_node_id"] not in seen_nodes:
            related_nodes.append({
                "id": record["other_node_id"],
                "labels": record["other_node_labels"],
                "data": record["other_node_data"],
                "label": record["other_node_data"].get("label", "Node"),
                "type": "custom",
                "caption": record["other_node_data"].get("label", "Node")
            })
            seen_nodes.add(record["other_node_id"])
    
    # Combine center node with related nodes
    all_nodes = [center_node] + related_nodes
    
    return {
        "nds": all_nodes,
        "rls": relationships
    }
    
