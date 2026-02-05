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
from flowsint_core.core.graph import GraphNode
from flowsint_core.core.models import Profile
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.services import (
    create_sketch_service,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
    DatabaseError,
)
from flowsint_core.imports import (
    EntityMapping,
    ImportService,
    create_import_service,
    FileParseResult,
)
from flowsint_core.core.graph import create_graph_service
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.sketch import SketchCreate, SketchRead, SketchUpdate
from app.api.sketch_utils import update_sketch_timestamp

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


class RelationInput(BaseModel):
    source: str
    target: str
    type: Literal["one-way", "two-way"]
    label: str = "RELATED_TO"


class NodePosition(BaseModel):
    nodeId: str
    x: float
    y: float


class UpdatePositionsInput(BaseModel):
    positions: List[NodePosition]


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


@router.post("/create", response_model=SketchRead, status_code=status.HTTP_201_CREATED)
def create_sketch(
    data: SketchCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_sketch_service(db)
    try:
        sketch_data = data.model_dump()
        return service.create(
            title=sketch_data.get("title"),
            description=sketch_data.get("description"),
            investigation_id=sketch_data.get("investigation_id"),
            owner_id=current_user.id,
        )
    except ValidationError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("", response_model=List[SketchRead])
def list_sketches(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    service = create_sketch_service(db)
    return service.list_sketches(current_user.id)


@router.get("/{sketch_id}")
def get_sketch_by_id(
    sketch_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_sketch_service(db)
    try:
        return service.get_by_id(sketch_id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.put("/{id}", response_model=SketchRead)
def update_sketch(
    id: UUID,
    payload: SketchUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_sketch_service(db)
    try:
        return service.update(id, current_user.id, payload.model_dump(exclude_unset=True))
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.delete("/{id}", status_code=204)
def delete_sketch(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_sketch_service(db)
    try:
        service.delete(id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except DatabaseError:
        raise HTTPException(status_code=500, detail="Failed to clean up graph data")


@router.get("/{sketch_id}/graph")
async def get_sketch_nodes(
    sketch_id: str,
    format: str | None = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Get the nodes and edges for a sketch."""
    service = create_sketch_service(db)
    try:
        return service.get_graph(UUID(sketch_id), current_user.id, format)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Graph not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/{sketch_id}/nodes/add")
@update_sketch_timestamp
def add_node(
    sketch_id: str,
    node: GraphNode,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_sketch_service(db)
    try:
        return service.add_node(UUID(sketch_id), current_user.id, node)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except ValidationError:
        raise HTTPException(status_code=400, detail="Node creation failed")
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sketch_id}/relations/add")
@update_sketch_timestamp
def add_edge(
    sketch_id: str,
    relation: RelationInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_sketch_service(db)
    try:
        return service.add_relationship(
            UUID(sketch_id), current_user.id, relation.source, relation.target, relation.label
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except ValidationError:
        raise HTTPException(status_code=400, detail="Edge creation failed")
    except DatabaseError:
        raise HTTPException(status_code=500, detail="Failed to create edge")


@router.put("/{sketch_id}/nodes/edit")
@update_sketch_timestamp
def edit_node(
    sketch_id: str,
    node_edit: NodeEditInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_sketch_service(db)
    try:
        return service.update_node(
            UUID(sketch_id), current_user.id, node_edit.nodeId, node_edit.updates
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except DatabaseError:
        raise HTTPException(status_code=500, detail="Failed to update node")


@router.put("/{sketch_id}/nodes/positions")
@update_sketch_timestamp
def update_node_positions(
    sketch_id: str,
    data: UpdatePositionsInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Update positions (x, y) for multiple nodes in batch."""
    service = create_sketch_service(db)
    try:
        positions = [pos.model_dump() for pos in data.positions]
        return service.update_node_positions(UUID(sketch_id), current_user.id, positions)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except DatabaseError:
        raise HTTPException(status_code=500, detail="Failed to update node positions")


@router.delete("/{sketch_id}/nodes")
@update_sketch_timestamp
def delete_nodes(
    sketch_id: str,
    nodes: NodeDeleteInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_sketch_service(db)
    try:
        return service.delete_nodes(UUID(sketch_id), current_user.id, nodes.nodeIds)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except DatabaseError:
        raise HTTPException(status_code=500, detail="Failed to delete nodes")


@router.delete("/{sketch_id}/relationships")
@update_sketch_timestamp
def delete_relationships(
    sketch_id: str,
    relationships: RelationshipDeleteInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_sketch_service(db)
    try:
        return service.delete_relationships(
            UUID(sketch_id), current_user.id, relationships.relationshipIds
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except DatabaseError:
        raise HTTPException(status_code=500, detail="Failed to delete relationships")


@router.put("/{sketch_id}/relationships/edit")
@update_sketch_timestamp
def edit_relationship(
    sketch_id: str,
    relationship_edit: RelationshipEditInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_sketch_service(db)
    try:
        return service.update_relationship(
            UUID(sketch_id),
            current_user.id,
            relationship_edit.relationshipId,
            relationship_edit.data,
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except DatabaseError:
        raise HTTPException(status_code=500, detail="Failed to update relationship")


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
    service = create_sketch_service(db)
    try:
        node_data = newNode.data.model_dump() if newNode.data else {}
        return service.merge_nodes(
            UUID(sketch_id), current_user.id, oldNodes, newNode.id, node_data
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sketch_id}/nodes/{node_id}")
def get_related_nodes(
    sketch_id: str,
    node_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_sketch_service(db)
    try:
        return service.get_neighbors(UUID(sketch_id), current_user.id, node_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except DatabaseError:
        raise HTTPException(status_code=500, detail="Failed to retrieve related nodes")


@router.post("/{sketch_id}/import/analyze", response_model=FileParseResult)
async def analyze_import_file(
    sketch_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Analyze an uploaded TXT or JSON file for import."""
    service = create_sketch_service(db)
    try:
        service.get_by_id(UUID(sketch_id), current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")

    if not file.filename or not file.filename.lower().endswith((".txt", ".json")):
        raise HTTPException(
            status_code=400,
            detail="Only .txt and .json files are supported. Please upload a correct format.",
        )

    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

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


@router.post("/{sketch_id}/import/execute", response_model=ImportExecuteResponse)
@update_sketch_timestamp
async def execute_import(
    sketch_id: str,
    entity_mappings_json: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Execute the import of entities into the sketch."""
    import json

    service = create_sketch_service(db)
    try:
        service.get_by_id(UUID(sketch_id), current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        mappings = json.loads(entity_mappings_json)
        nodes = mappings.get("nodes", [])
        edges = mappings.get("edges", [])
        entity_mapping_inputs = [EntityMappingInput(**m) for m in nodes]
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid entity_mappings JSON")
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to parse entity_mappings: {str(e)}"
        )

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

    graph_service = create_graph_service(sketch_id=sketch_id, enable_batching=False)
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
    """Export the sketch in the specified format."""
    service = create_sketch_service(db)
    try:
        return service.export_sketch(UUID(id), current_user.id, format)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sketch not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
