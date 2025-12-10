from app.security.permissions import check_investigation_permission
from fastapi import (
    APIRouter,
    HTTPException,
    Depends,
    status,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
)
from flowsint_types import TYPE_REGISTRY
from pydantic import BaseModel, Field
from typing import Literal, List, Optional, Dict, Any
from datetime import datetime, timezone
from flowsint_core.utils import flatten
from sqlalchemy.orm import Session
from app.api.schemas.sketch import SketchCreate, SketchRead, SketchUpdate
from flowsint_core.core.models import Sketch, Profile
from uuid import UUID
from flowsint_core.core.graph_db import neo4j_connection
from flowsint_core.core.graph_repository import GraphRepository
from flowsint_core.core.postgre_db import get_db
from app.api.deps import get_current_user
from flowsint_core.imports import FileParseResult, parse_import_file
from app.api.sketch_utils import update_sketch_timestamp

router = APIRouter()


class NodeData(BaseModel):
    label: str = Field(default="Node", description="Label/name of the node")
    type: str = Field(default="Node", description="Type of the node")

    class Config:
        extra = "allow"


class NodeInput(BaseModel):
    type: str = Field(..., description="Type of the node")
    data: NodeData = Field(
        default_factory=NodeData, description="Additional data for the node"
    )

    class Config:
        extra = "allow"  # Accept any additional fields


class NodeDeleteInput(BaseModel):
    nodeIds: List[str]


class RelationshipDeleteInput(BaseModel):
    relationshipIds: List[str]


class NodeEditInput(BaseModel):
    nodeId: str
    data: NodeData = Field(
        default_factory=NodeData, description="Updated data for the node"
    )


class NodeMergeInput(BaseModel):
    id: str
    data: NodeData = Field(
        default_factory=NodeData, description="Updated data for the node"
    )


@router.post("/create", response_model=SketchRead, status_code=status.HTTP_201_CREATED)
def create_sketch(
    data: SketchCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    sketch_data = data.dict()
    check_investigation_permission(
        current_user.id, sketch_data.get("investigation_id"), actions=["create"], db=db
    )
    sketch_data["owner_id"] = current_user.id
    sketch = Sketch(**sketch_data)
    db.add(sketch)
    db.commit()
    db.refresh(sketch)
    return sketch


@router.get("", response_model=List[SketchRead])
def list_sketches(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    return db.query(Sketch).filter(Sketch.owner_id == current_user.id).all()


@router.get("/{sketch_id}")
def get_sketch_by_id(
    sketch_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["read"], db=db
    )
    return sketch


@router.put("/{id}", response_model=SketchRead)
def update_sketch(
    id: UUID,
    payload: SketchUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    sketch = db.query(Sketch).filter(Sketch.id == id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["update"], db=db
    )
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(sketch, key, value)
    db.commit()
    db.refresh(sketch)
    return sketch


@router.delete("/{id}", status_code=204)
def delete_sketch(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    sketch = db.query(Sketch).filter(Sketch.id == id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["delete"], db=db
    )

    # Delete all nodes and relationships in Neo4j first using GraphRepository
    try:
        graph_repo = GraphRepository(neo4j_connection)
        graph_repo.delete_all_sketch_nodes(str(id))
    except Exception as e:
        print(f"Neo4j cleanup error: {e}")
        raise HTTPException(status_code=500, detail="Failed to clean up graph data")

    # Then delete the sketch from PostgreSQL
    db.delete(sketch)
    db.commit()


@router.get("/{id}/graph")
async def get_sketch_nodes(
    id: str,
    format: str = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Get the nodes and relationships for a sketch.
    Args:
        id: The ID of the sketch
        format: Optional format parameter. If "inline", returns inline relationships
        db: The database session
        current_user: The current user
    Returns:
        A dictionary containing the nodes and relationships for the sketch
        nds: []
        rls: []
        Or if format=inline: List of inline relationship strings
    """
    sketch = db.query(Sketch).filter(Sketch.id == id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Graph not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["read"], db=db
    )
    # Get all nodes and relationships using GraphRepository
    graph_repo = GraphRepository(neo4j_connection)
    graph_data = graph_repo.get_sketch_graph(id, limit=100000)

    nodes_result = graph_data["nodes"]
    rels_result = graph_data["relationships"]

    nodes = [
        {
            "id": str(record["id"]),
            "data": record["data"],
            "label": record["data"].get("label", "Node"),
            "idx": idx,
            # Extract x and y positions if they exist
            **({"x": record["data"]["x"]} if "x" in record["data"] else {}),
            **({"y": record["data"]["y"]} if "y" in record["data"] else {}),
        }
        for idx, record in enumerate(nodes_result)
    ]

    rels = [
        {
            "id": str(record["id"]),
            "source": str(record["source"]),
            "target": str(record["target"]),
            "data": record["data"],
            "label": record["type"],
        }
        for record in rels_result
    ]

    if format == "inline":
        from flowsint_core.utils import get_inline_relationships

        return get_inline_relationships(nodes, rels)

    return {"nds": nodes, "rls": rels}


def clean_empty_values(data: dict) -> dict:
    """Remove empty string values from dict to avoid Pydantic validation errors."""
    cleaned = {}
    for key, value in data.items():
        if value == "" or value is None:
            continue
        if isinstance(value, dict):
            cleaned_nested = clean_empty_values(value)
            if cleaned_nested:
                cleaned[key] = cleaned_nested
        elif isinstance(value, list):
            cleaned_list = [
                clean_empty_values(item) if isinstance(item, dict) else item
                for item in value
                if item != "" and item is not None
            ]
            if cleaned_list:
                cleaned[key] = cleaned_list
        else:
            cleaned[key] = value
    return cleaned


@router.post("/{sketch_id}/nodes/add")
@update_sketch_timestamp
def add_node(
    sketch_id: str,
    node: NodeInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["update"], db=db
    )

    node_data = node.data.model_dump()
    node_type = node_data["type"]

    DetectedType = TYPE_REGISTRY.get_lowercase(node_type)
    if not DetectedType:
        raise HTTPException(status_code=400, detail=f"Unknown type: {node_type}")

    cleaned_data = clean_empty_values(node_data)

    try:
        pydantic_obj = DetectedType(**cleaned_data)
    except Exception as e:
        print(f"Pydantic validation error: {e}")
        raise HTTPException(
            status_code=400, detail=f"Invalid data for type {node_type}: {str(e)}"
        )

    try:
        graph_repo = GraphRepository(neo4j_connection)
        element_id = graph_repo.create_node(pydantic_obj, sketch_id=sketch_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if not element_id:
        raise HTTPException(status_code=400, detail="Node creation failed")

    obj_dict = (
        pydantic_obj.model_dump(mode="json")
        if hasattr(pydantic_obj, "model_dump")
        else pydantic_obj.dict()
    )
    # Extract only non-dict values, skip None keys
    obj_properties = {
        k: (v if v is not None else "")
        for k, v in obj_dict.items()
        if k is not None and not isinstance(v, dict)
    }
    obj_properties["id"] = element_id
    obj_properties["type"] = node_type

    return {
        "status": "node added",
        "node": {
            "id": element_id,
            "data": obj_properties,
        },
    }


class RelationInput(BaseModel):
    source: str
    target: str
    type: Literal["one-way", "two-way"]
    label: str = "RELATED_TO"  # Optionnel : nom de la relation


@router.post("/{sketch_id}/relations/add")
@update_sketch_timestamp
def add_edge(
    sketch_id: str,
    relation: RelationInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["update"], db=db
    )

    # Create relationship using GraphRepository
    try:
        graph_repo = GraphRepository(neo4j_connection)
        result = graph_repo.create_relationship_by_element_id(
            from_element_id=relation.source,
            to_element_id=relation.target,
            rel_type=relation.label,
            sketch_id=sketch_id,
        )
    except Exception as e:
        print(f"Edge creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create edge")

    if not result:
        raise HTTPException(status_code=400, detail="Edge creation failed")

    return {
        "status": "edge added",
        "edge": result,
    }


@router.put("/{sketch_id}/nodes/edit")
@update_sketch_timestamp
def edit_node(
    sketch_id: str,
    node_edit: NodeEditInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    # First verify the sketch exists and belongs to the user
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["update"], db=db
    )

    node_data = node_edit.data.model_dump()
    node_type = node_data.get("type", "Node")

    # Get the Pydantic type from registry
    DetectedType = TYPE_REGISTRY.get_lowercase(node_type)
    if not DetectedType:
        raise HTTPException(status_code=400, detail=f"Unknown type: {node_type}")

    # Clean empty values
    cleaned_data = clean_empty_values(node_data)

    # Convert to Pydantic object
    try:
        pydantic_obj = DetectedType(**cleaned_data)
    except Exception as e:
        print(f"Pydantic validation error: {e}")
        raise HTTPException(
            status_code=400, detail=f"Invalid data for type {node_type}: {str(e)}"
        )

    # Update node using GraphRepository
    try:
        graph_repo = GraphRepository(neo4j_connection)
        updated_element_id = graph_repo.update_node(
            element_id=node_edit.nodeId,
            node_obj=pydantic_obj,
            sketch_id=sketch_id,
        )
    except Exception as e:
        print(f"Node update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update node")

    if not updated_element_id:
        raise HTTPException(status_code=404, detail="Node not found or not accessible")

    # Return updated node with its data
    pydantic_data = pydantic_obj.model_dump(mode="json")
    pydantic_data["id"] = updated_element_id

    return {
        "status": "node updated",
        "node": {
            "id": updated_element_id,
            "data": pydantic_data,
        },
    }


class NodePosition(BaseModel):
    nodeId: str
    x: float
    y: float


class UpdatePositionsInput(BaseModel):
    positions: List[NodePosition]


@router.put("/{sketch_id}/nodes/positions")
@update_sketch_timestamp
def update_node_positions(
    sketch_id: str,
    data: UpdatePositionsInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Update positions (x, y) for multiple nodes in batch.
    This is used to persist node positions after drag operations in the graph viewer.
    """
    # Verify the sketch exists and user has access
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["update"], db=db
    )

    if not data.positions:
        return {"status": "no positions to update", "count": 0}

    # Convert Pydantic models to dicts for GraphRepository
    positions = [pos.model_dump() for pos in data.positions]

    # Update positions using GraphRepository
    try:
        graph_repo = GraphRepository(neo4j_connection)
        updated_count = graph_repo.update_nodes_positions(
            positions=positions, sketch_id=sketch_id
        )
    except Exception as e:
        print(f"Position update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update node positions")

    return {
        "status": "positions updated",
        "count": updated_count,
    }


@router.delete("/{sketch_id}/nodes")
@update_sketch_timestamp
def delete_nodes(
    sketch_id: str,
    nodes: NodeDeleteInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    # First verify the sketch exists and belongs to the user
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["update"], db=db
    )

    # Delete nodes and their relationships using GraphRepository
    try:
        graph_repo = GraphRepository(neo4j_connection)
        deleted_count = graph_repo.delete_nodes(nodes.nodeIds, sketch_id)
    except Exception as e:
        print(f"Node deletion error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete nodes")

    return {"status": "nodes deleted", "count": deleted_count}


@router.delete("/{sketch_id}/relationships")
@update_sketch_timestamp
def delete_relationships(
    sketch_id: str,
    relationships: RelationshipDeleteInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    # First verify the sketch exists and belongs to the user
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["update"], db=db
    )

    # Delete relationships using GraphRepository
    try:
        graph_repo = GraphRepository(neo4j_connection)
        deleted_count = graph_repo.delete_relationships(
            relationships.relationshipIds, sketch_id
        )
    except Exception as e:
        print(f"Relationship deletion error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete relationships")

    return {"status": "relationships deleted", "count": deleted_count}


@router.post("/{sketch_id}/nodes/merge")
@update_sketch_timestamp
def merge_nodes(
    sketch_id: str,
    oldNodes: List[str],
    newNode: NodeMergeInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["update"], db=db
    )

    if not oldNodes or len(oldNodes) == 0:
        raise HTTPException(status_code=400, detail="oldNodes cannot be empty")

    node_data = newNode.data.model_dump() if newNode.data else {}
    node_type = node_data.get("type", "Node")

    properties = {
        "type": node_type.lower(),
        "label": node_data.get("label", "Merged Node"),
    }

    flattened_data = flatten(node_data)
    properties.update(flattened_data)

    try:
        graph_repo = GraphRepository(neo4j_connection)
        new_node_element_id = graph_repo.merge_nodes(
            old_node_ids=oldNodes,
            new_node_data=properties,
            new_node_id=newNode.id,
            sketch_id=sketch_id,
        )
    except Exception as e:
        print(f"Node merge error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to merge nodes: {str(e)}")

    if not new_node_element_id:
        raise HTTPException(status_code=500, detail="Failed to merge nodes")

    return {
        "status": "nodes merged",
        "count": len(oldNodes),
        "new_node_id": new_node_element_id,
    }


@router.get("/{sketch_id}/nodes/{node_id}")
def get_related_nodes(
    sketch_id: str,
    node_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["read"], db=db
    )

    try:
        graph_repo = GraphRepository(neo4j_connection)
        result = graph_repo.get_related_nodes(node_id=node_id, sketch_id=sketch_id)
    except Exception as e:
        print(f"Related nodes query error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve related nodes")

    if not result["nds"]:
        raise HTTPException(status_code=404, detail="Node not found")

    return result


@router.post("/{sketch_id}/import/analyze", response_model=FileParseResult)
async def analyze_import_file(
    sketch_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Analyze an uploaded TXT file for import.
    Each line represents one entity. Detects entity types and provides preview.
    """
    # Verify sketch exists and user has access
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["read"], db=db
    )

    # Validate file extension
    if not file.filename or not file.filename.lower().endswith(".txt"):
        raise HTTPException(
            status_code=400,
            detail="Only .txt files are supported. Please upload a text file with one value per line.",
        )

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    # Parse and analyze the file
    try:
        result = parse_import_file(
            file_content=content,
            filename=file.filename or "unknown.csv",
            max_preview_rows=10000000,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")

    return result


class EntityMapping(BaseModel):
    """Mapping configuration for an entity."""

    id: str  # Unique identifier for this entity (generated by frontend)
    entity_type: str
    include: bool = True
    label: str
    data: Dict[str, Any]  # Entity data from frontend


class ImportExecuteResponse(BaseModel):
    """Response model for import execution."""

    status: str
    nodes_created: int
    nodes_skipped: int
    errors: List[str]


@router.post("/{sketch_id}/import/execute", response_model=ImportExecuteResponse)
@update_sketch_timestamp
async def execute_import(
    sketch_id: str,
    entity_mappings_json: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Execute the import of entities into the sketch.
    Uses the entity mappings provided by the frontend (no file re-parsing needed).
    """
    import json

    # Verify sketch exists and user has access
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["update"], db=db
    )

    # Parse entity mappings
    try:
        mappings_data = json.loads(entity_mappings_json)
        entity_mappings = [EntityMapping(**m) for m in mappings_data]
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid entity_mappings JSON")
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to parse entity_mappings: {str(e)}"
        )

    # Filter only entities marked for inclusion
    entities_to_import = [m for m in entity_mappings if m.include]

    # Convert entity mappings to Pydantic objects
    pydantic_nodes = []
    conversion_errors = []

    for idx, mapping in enumerate(entities_to_import):
        entity_type = mapping.entity_type
        label = mapping.label
        entity_data = mapping.data

        # Get the Pydantic type from registry
        DetectedType = TYPE_REGISTRY.get_lowercase(entity_type)
        if not DetectedType:
            conversion_errors.append(f"Entity {idx + 1} ({label}): Unknown type {entity_type}")
            continue

        # Clean empty values and add label
        cleaned_data = clean_empty_values(entity_data)
        cleaned_data["label"] = label

        # Convert to Pydantic object
        try:
            pydantic_obj = DetectedType(**cleaned_data)
            pydantic_nodes.append(pydantic_obj)
        except Exception as e:
            conversion_errors.append(f"Entity {idx + 1} ({label}): {str(e)}")

    # Batch create all nodes
    graph_repo = GraphRepository(neo4j_connection)
    try:
        result = graph_repo.batch_create_nodes(nodes=pydantic_nodes, sketch_id=sketch_id)
        nodes_created = result["nodes_created"]
        batch_errors = result.get("errors", [])
        all_errors = conversion_errors + batch_errors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch import failed: {str(e)}")

    nodes_skipped = len(entities_to_import) - nodes_created

    return ImportExecuteResponse(
        status="completed" if not all_errors else "completed_with_errors",
        nodes_created=nodes_created,
        nodes_skipped=nodes_skipped,
        errors=all_errors[:50],  # Limit to first 50 errors
    )
