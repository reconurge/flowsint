from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from flowsint_core.core.graph import create_graph_service, GraphNode
from flowsint_core.core.models import Profile, Sketch
from flowsint_core.core.postgre_db import get_db
from flowsint_core.imports import (
    EntityMapping,
    ImportService,
    create_import_service,
    FileParseResult,
)
from flowsint_core.utils import flatten
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.sketch import SketchCreate, SketchRead, SketchUpdate
from app.api.sketch_utils import update_sketch_timestamp
from app.security.permissions import check_investigation_permission

router = APIRouter()


class NodeData(BaseModel):
    label: str = Field(default="Node", description="Label/name of the node")
    type: str = Field(default="Node", description="Type of the node")

    class Config:
        extra = "allow"


class NodeDeleteInput(BaseModel):
    nodeIds: List[str]


class RelationshipDeleteInput(BaseModel):
    relationshipIds: List[str]



class NodeEditInput(BaseModel):
    nodeId: str
    updates: Dict[str, Any]


class RelationshipEditInput(BaseModel):
    relationshipId: str
    data: Dict[str, Any] = Field(
        default_factory=dict, description="Updated data for the relationship"
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
    sketch_data = data.model_dump()
    investigation_id = sketch_data.get("investigation_id")
    if not investigation_id:
        raise HTTPException(status_code=404, detail="Investigation not found")
    check_investigation_permission(
        current_user.id, investigation_id, actions=["create"], db=db
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

    # Delete all nodes and relationships in Neo4j first using GraphService
    try:
        graph_service = create_graph_service(
            sketch_id=str(id), enable_batching=False
        )
        graph_service.delete_all_sketch_nodes()
    except Exception as e:
        print(f"Neo4j cleanup error: {e}")
        raise HTTPException(status_code=500, detail="Failed to clean up graph data")

    # Then delete the sketch from PostgreSQL
    db.delete(sketch)
    db.commit()


@router.get("/{sketch_id}/graph")
async def get_sketch_nodes(
    sketch_id: str,
    format: str | None = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Get the nodes and edges for a sketch.
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
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Graph not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["read"], db=db
    )
    # Get all nodes and relationships using GraphService
    graph_service = create_graph_service(
        sketch_id=sketch_id, enable_batching=False
    )
    graph_data = graph_service.get_sketch_graph()
    if format == "inline":
        from flowsint_core.utils import get_inline_relationships

        return get_inline_relationships(graph_data.nodes, graph_data.edges)

    graph = graph_data.model_dump(mode="json", serialize_as_any=True)

    return {"nds": graph["nodes"], "rls": graph["edges"]}


@router.post("/{sketch_id}/nodes/add")
@update_sketch_timestamp
def add_node(
    sketch_id: str,
    node: GraphNode,
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
    try:
        graph_service = create_graph_service(
            sketch_id=sketch_id,
            enable_batching=False,
        )
        node_id = graph_service.create_node(node)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if not node_id:
        raise HTTPException(status_code=400, detail="Node creation failed")

    node.id = node_id

    return {
        "status": "node added",
        "node": node,
    }


class RelationInput(BaseModel):
    source: str
    target: str
    type: Literal["one-way", "two-way"]
    label: str = "RELATED_TO"


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

    # Create relationship using GraphService
    try:
        graph_service = create_graph_service(
            sketch_id=sketch_id,
            enable_batching=False,
        )
        result = graph_service.create_relationship_by_element_id(
            from_element_id=relation.source,
            to_element_id=relation.target,
            rel_label=relation.label,
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

    updates = node_edit.updates
    try:
        graph_service = create_graph_service(
            sketch_id=sketch_id,
            enable_batching=False,
        )
        updated_element_id = graph_service.update_node(
            element_id=node_edit.nodeId,
            updates=updates,
        )
    except Exception as e:
        print(f"Node update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update node")

    if not updated_element_id:
        raise HTTPException(status_code=404, detail="Node not found or not accessible")

    return {
        "status": "node updated",
        "node": {
            "id": updated_element_id,
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

    # Convert Pydantic models to dicts for GraphService
    positions = [pos.model_dump() for pos in data.positions]

    # Update positions using GraphService
    try:
        graph_service = create_graph_service(
            sketch_id=sketch_id,
            enable_batching=False,
        )
        updated_count = graph_service.update_nodes_positions(positions=positions)
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

    # Delete nodes and their relationships using GraphService
    try:
        graph_service = create_graph_service(
            sketch_id=sketch_id,
            enable_batching=False,
        )
        deleted_count = graph_service.delete_nodes(nodes.nodeIds)
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

    # Delete relationships using GraphService
    try:
        graph_service = create_graph_service(
            sketch_id=sketch_id,
            enable_batching=False,
        )
        deleted_count = graph_service.delete_relationships(
            relationships.relationshipIds
        )
    except Exception as e:
        print(f"Relationship deletion error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete relationships")

    return {"status": "relationships deleted", "count": deleted_count}


@router.put("/{sketch_id}/relationships/edit")
@update_sketch_timestamp
def edit_relationship(
    sketch_id: str,
    relationship_edit: RelationshipEditInput,
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

    # Update edge using GraphService
    try:
        graph_service = create_graph_service(
            sketch_id=sketch_id,
            enable_batching=False,
        )
        result = graph_service.update_relationship(
            element_id=relationship_edit.relationshipId,
            properties=relationship_edit.data,
        )
    except Exception as e:
        print(f"Relationship update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update relationship")

    if not result:
        raise HTTPException(
            status_code=404, detail="Relationship not found or not accessible"
        )

    return {
        "status": "relationship updated",
        "relationship": {
            "id": result["id"],
            "label": result["type"],
            "data": result["data"],
        },
    }


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
        graph_service = create_graph_service(
            sketch_id=sketch_id,
            enable_batching=False,
        )
        new_node_element_id = graph_service.merge_nodes(
            old_node_ids=oldNodes,
            new_node_data=properties,
            new_node_id=newNode.id,
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
        graph_service = create_graph_service(sketch_id=sketch_id)
        result = graph_service.get_neighbors(node_id)

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Failed to retrieve related nodes")

    if not result.nodes:
        raise HTTPException(status_code=404, detail="Node not found")

    return {"nds": result.nodes, "rls": result.edges}


@router.post("/{sketch_id}/import/analyze", response_model=FileParseResult)
async def analyze_import_file(
    sketch_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Analyze an uploaded TXT or JSON file for import.
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
    if not file.filename or not file.filename.lower().endswith((".txt", ".json")):
        raise HTTPException(
            status_code=400,
            detail="Only .txt and .json files are supported. Please upload a correct format.",
        )

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    # Analyze file using ImportService
    try:
        result = ImportService.analyze_file(
            file_content=content,
            filename=file.filename or "unknown.txt",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")

    return result


class EntityMappingInput(BaseModel):
    """Pydantic model for parsing entity mapping input from frontend."""

    id: str
    entity_type: str
    include: bool = True
    nodeLabel: str
    node_id: Optional[str] = None
    data: Dict[str, Any]


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

    # Parse entity mappings JSON
    try:
        mappings = json.loads(entity_mappings_json)
        nodes = mappings.get("nodes", [])
        edges = mappings.get("edges", [])
        print(nodes)
        entity_mapping_inputs = [EntityMappingInput(**m) for m in nodes]
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid entity_mappings JSON")
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to parse entity_mappings: {str(e)}"
        )

    # Convert Pydantic inputs to service dataclasses
    entity_mappings = [
        EntityMapping(
            id=m.id,
            entity_type=m.entity_type,
            nodeLabel=m.nodeLabel,
            data=m.data,
            include=m.include,
            node_id=m.node_id,
        )
        for m in entity_mapping_inputs
    ]

    # Execute import using ImportService
    graph_service = create_graph_service(
        sketch_id=sketch_id, enable_batching=False
    )
    import_service = create_import_service(graph_service)

    try:
        result = import_service.execute_import(
            entity_mappings=entity_mappings,
            edges=edges,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

    return ImportExecuteResponse(
        status=result.status,
        nodes_created=result.nodes_created,
        nodes_skipped=result.nodes_skipped,
        errors=result.errors,
    )


@router.get("/{id}/export")
async def export_sketch(
    id: str,
    format: str = "json",
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Export the sketch in the specified format.
    Args:
        id: The ID of the sketch
        format: Export format - "json" (only format for now)
        db: The database session
        current_user: The current user
    Returns:
        The sketch data in the requested format
    """
    sketch = db.query(Sketch).filter(Sketch.id == id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["read"], db=db
    )

    # Get all nodes and relationships using GraphService
    graph_service = create_graph_service(
        sketch_id=id, enable_batching=False
    )
    graph_data = graph_service.get_sketch_graph()

    if format == "json":
        return {
            "sketch": {
                "id": str(sketch.id),
                "title": sketch.title,
                "description": sketch.description,
            },
            "nodes": [node.model_dump(mode="json") for node in graph_data.nodes],
            "edges": [edge.model_dump(mode="json") for edge in graph_data.edges],
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
