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
from flowsint_core.imports import parse_file
from app.api.sketch_utils import update_sketch_timestamp

router = APIRouter()


class NodeData(BaseModel):
    label: str = Field(default="Node", description="Label/name of the node")
    color: str = Field(default="Node", description="Color of the node")
    type: str = Field(default="Node", description="Type of the node")
    # Add any other specific data fields that might be common across nodes

    class Config:
        extra = "allow"  # Accept any additional fields


class NodeInput(BaseModel):
    type: str = Field(..., description="Type of the node")
    data: NodeData = Field(
        default_factory=NodeData, description="Additional data for the node"
    )


def dict_to_cypher_props(props: dict, prefix: str = "") -> str:
    return ", ".join(f"{key}: ${prefix}{key}" for key in props)


class NodeDeleteInput(BaseModel):
    nodeIds: List[str]


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
    sketch = (
        db.query(Sketch)
        .filter(Sketch.id == id)
        .first()
    )
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
    sketch = (
        db.query(Sketch)
        .filter(Sketch.id == id)
        .first()
    )
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
    current_user: Profile = Depends(get_current_user)
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
    sketch = (
        db.query(Sketch)
        .filter(Sketch.id == id)
        .first()
    )
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

    # Add created_at to parameters
    properties_with_timestamp = {
        **properties,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    create_query = f"""
        MERGE (d:`{node_type}` {{ {cypher_props} }})
        ON CREATE SET d.created_at = $created_at
        RETURN d as node, elementId(d) as id
    """

    try:
        create_result = neo4j_connection.query(create_query, properties_with_timestamp)
    except Exception as e:
        print(f"Query execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if not create_result:
        raise HTTPException(
            status_code=400, detail="Node creation failed - no result returned"
        )

    try:
        new_node = create_result[0]["node"]
        new_node["id"] = create_result[0]["id"]
    except (IndexError, KeyError) as e:
        print(f"Error extracting node_id: {e}, result: {create_result}")
        raise HTTPException(
            status_code=500, detail="Failed to extract node data from response"
        )

    new_node["data"] = node_data
    new_node["data"]["id"] = new_node["id"]

    return {
        "status": "node added",
        "node": new_node,
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
            sketch_id=sketch_id
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

    # Update node using GraphRepository
    try:
        graph_repo = GraphRepository(neo4j_connection)
        updated_node = graph_repo.update_node_by_element_id(
            element_id=node_edit.nodeId,
            sketch_id=sketch_id,
            **properties
        )
    except Exception as e:
        print(f"Node update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update node")

    if not updated_node:
        raise HTTPException(status_code=404, detail="Node not found or not accessible")

    updated_node["data"] = node_data

    return {
        "status": "node updated",
        "node": updated_node,
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
    # 1. Verify the sketch exists
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["update"], db=db
    )

    if not oldNodes or len(oldNodes) == 0:
        raise HTTPException(status_code=400, detail="oldNodes cannot be empty")

    oldNodeIds = oldNodes

    # 2. Prepare the merged node data
    node_data = newNode.data.model_dump() if newNode.data else {}
    node_type = node_data.get("type", "Node")

    # Build properties for the new merged node
    properties = {
        "type": node_type.lower(),
        "sketch_id": sketch_id,
        "label": node_data.get("label", "Merged Node"),
        "caption": node_data.get("label", "Merged Node"),
    }

    # Add all other data from the node
    flattened_data = flatten(node_data)
    properties.update(flattened_data)

    # 3. Check if the newNode.id is one of the old nodes (reusing existing node)
    # or if we need to create a brand new node
    is_reusing_node = newNode.id in oldNodeIds

    if is_reusing_node:
        # Update the existing node that we're keeping
        set_clause = ", ".join(f"n.{key} = ${key}" for key in properties.keys())
        create_query = f"""
        MATCH (n)
        WHERE elementId(n) = $nodeId AND n.sketch_id = $sketch_id
        SET {set_clause}
        RETURN elementId(n) as newElementId
        """
        params = {"nodeId": newNode.id, "sketch_id": sketch_id, **properties}
    else:
        # Create a completely new node with created_at timestamp
        properties["created_at"] = datetime.now(timezone.utc).isoformat()

        create_query = f"""
        CREATE (n:`{node_type}`)
        SET n = $properties
        RETURN elementId(n) as newElementId
        """
        params = {"properties": properties}

    try:
        result = neo4j_connection.query(create_query, params)
        if not result:
            raise HTTPException(
                status_code=500, detail="Failed to create/update merged node"
            )
        new_node_element_id = result[0]["newElementId"]
    except Exception as e:
        print(f"Error creating/updating merged node: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create merged node: {str(e)}"
        )

    # 4. Copy all relationships from old nodes to the new node
    # This handles both incoming and outgoing relationships while preserving types and properties
    copy_relationships_query = """
    MATCH (new) WHERE elementId(new) = $newElementId

    UNWIND $oldNodeIds AS oldNodeId
    MATCH (old) WHERE elementId(old) = oldNodeId AND old.sketch_id = $sketch_id

    // Copy incoming relationships - get all unique combinations
    WITH new, collect(old) as oldNodes
    UNWIND oldNodes as old
    MATCH (src)-[r]->(old)
    WHERE elementId(src) NOT IN $oldNodeIds AND elementId(src) <> $newElementId
    WITH new, src, type(r) as relType, properties(r) as relProps, r
    MERGE (src)-[newRel:RELATED_TO {sketch_id: $sketch_id}]->(new)
    SET newRel = relProps

    WITH new, $oldNodeIds as oldNodeIds
    UNWIND oldNodeIds AS oldNodeId
    MATCH (old) WHERE elementId(old) = oldNodeId AND old.sketch_id = $sketch_id

    // Copy outgoing relationships
    MATCH (old)-[r]->(dst)
    WHERE elementId(dst) NOT IN oldNodeIds AND elementId(dst) <> $newElementId
    WITH new, dst, type(r) as relType, properties(r) as relProps
    MERGE (new)-[newRel:RELATED_TO {sketch_id: $sketch_id}]->(dst)
    SET newRel = relProps
    """

    try:
        neo4j_connection.query(
            copy_relationships_query,
            {
                "newElementId": new_node_element_id,
                "oldNodeIds": oldNodeIds,
                "sketch_id": sketch_id,
            },
        )
    except Exception as e:
        print(f"Error copying relationships: {e}")
        # Don't fail if relationship copying has issues, continue to deletion

    # 5. Delete the old nodes (except if we're reusing one)
    nodes_to_delete = [nid for nid in oldNodeIds if nid != new_node_element_id]

    if nodes_to_delete:
        delete_query = """
        UNWIND $nodeIds AS nodeId
        MATCH (old)
        WHERE elementId(old) = nodeId AND old.sketch_id = $sketch_id
        DETACH DELETE old
        """
        try:
            neo4j_connection.query(
                delete_query, {"nodeIds": nodes_to_delete, "sketch_id": sketch_id}
            )
        except Exception as e:
            print(f"Error deleting old nodes: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete old nodes")

    return {
        "status": "nodes merged",
        "count": len(oldNodeIds),
        "new_node_id": new_node_element_id,
    }


@router.get("/{sketch_id}/nodes/{node_id}")
def get_related_nodes(
    sketch_id: str,
    node_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    # First verify the sketch exists and belongs to the user
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["read"], db=db
    )

    # Query to get all direct relationships and connected nodes
    # First, let's get the center node
    center_query = """
    MATCH (n)
    WHERE elementId(n) = $node_id AND n.sketch_id = $sketch_id
    RETURN elementId(n) as id, labels(n) as labels, properties(n) as data
    """

    try:
        center_result = neo4j_connection.query(
            center_query, {"sketch_id": sketch_id, "node_id": node_id}
        )
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
        result = neo4j_connection.query(
            relationships_query, {"sketch_id": sketch_id, "node_id": node_id}
        )
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
        "caption": center_record["data"].get("label", "Node"),
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
                relationships.append(
                    {
                        "id": record["rel_id"],
                        "type": "straight",
                        "source": center_node["id"],
                        "target": record["other_node_id"],
                        "data": record["rel_data"],
                        "caption": record["rel_type"],
                    }
                )
            else:  # incoming
                relationships.append(
                    {
                        "id": record["rel_id"],
                        "type": "straight",
                        "source": record["other_node_id"],
                        "target": center_node["id"],
                        "data": record["rel_data"],
                        "caption": record["rel_type"],
                    }
                )
            seen_relationships.add(record["rel_id"])

        # Add related node if not seen
        if (
            record["other_node_id"]
            and record["other_node_id"] not in seen_nodes
            and record["other_node_id"] != center_node["id"]
        ):
            related_nodes.append(
                {
                    "id": record["other_node_id"],
                    "labels": record["other_node_labels"],
                    "data": record["other_node_data"],
                    "label": record["other_node_data"].get("label", "Node"),
                    "type": "custom",
                    "caption": record["other_node_data"].get("label", "Node"),
                }
            )
            seen_nodes.add(record["other_node_id"])

    # Combine center node with related nodes
    all_nodes = [center_node] + related_nodes

    return {"nds": all_nodes, "rls": relationships}


class EntityPreviewModel(BaseModel):
    """Preview model for a single entity."""

    row_index: int
    data: Dict[str, Any]
    detected_type: str
    primary_value: str
    confidence: str


class AnalyzeFileResponse(BaseModel):
    """Response model for file analysis."""

    entities: List[EntityPreviewModel]
    total_entities: int
    type_distribution: Dict[str, int]
    columns: List[str]


@router.post("/{sketch_id}/import/analyze", response_model=AnalyzeFileResponse)
async def analyze_import_file(
    sketch_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Analyze an uploaded file for import.
    Each row represents one entity. Detects entity types and provides preview.
    """
    # Verify sketch exists and user has access
    sketch = (
        db.query(Sketch)
        .filter(Sketch.id == sketch_id)
        .first()
    )
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    check_investigation_permission(
        current_user.id, sketch.investigation_id, actions=["read"], db=db
    )

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    # Parse and analyze the file
    try:
        result = parse_file(
            file_content=content,
            filename=file.filename or "unknown.csv",
            max_preview_rows=10000000,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")

    # Convert entities to response models (no slicing)
    entity_previews = [
        EntityPreviewModel(
            row_index=e.row_index,
            data=e.data,
            detected_type=e.detected_type,
            primary_value=e.primary_value,
            confidence=e.confidence,
        )
        for e in result.entities
    ]

    return AnalyzeFileResponse(
        entities=entity_previews,
        total_entities=result.total_entities,
        type_distribution=result.type_distribution,
        columns=result.columns,
    )


class EntityMapping(BaseModel):
    """Mapping configuration for an entity (row)."""

    row_index: int
    entity_type: str
    include: bool = True
    label: Optional[str] = None
    data: Optional[Dict[str, Any]] = None  # Edited data from frontend


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
    file: UploadFile = File(...),
    entity_mappings_json: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Execute the import of entities from a file into the sketch.
    Each row is one entity with all columns stored in data property.
    """
    import json

    # Verify sketch exists and user has access
    sketch = (
        db.query(Sketch)
        .filter(Sketch.id == sketch_id)
        .first()
    )
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

    # Read and parse file
    try:
        content = await file.read()
        result = parse_file(
            file_content=content,
            filename=file.filename or "unknown.csv",
            max_preview_rows=10000000,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")

    # Create mapping lookup by row index
    mappings_by_row = {m.row_index: m for m in entity_mappings if m.include}

    # Import entities using GraphRepository
    graph_repo = GraphRepository(neo4j_connection)
    nodes_created = 0
    nodes_skipped = 0
    errors = []

    for entity in result.entities:
        # Prefer explicit mapping when provided; otherwise import using detected defaults
        mapping = mappings_by_row.get(entity.row_index)
        if mapping:
            entity_type = mapping.entity_type
            label = mapping.label if mapping.label else entity.primary_value
            entity_data = mapping.data if mapping.data is not None else entity.data
        else:
            entity_type = entity.detected_type
            label = entity.primary_value
            entity_data = entity.data

        # Flatten entity data for storage
        flattened_data = flatten(entity_data)

        # Create node using GraphRepository
        try:
            node_id = graph_repo.create_node_from_import(
                node_type=entity_type,
                label=label,
                sketch_id=sketch_id,
                **flattened_data
            )
            if node_id:
                nodes_created += 1
            else:
                nodes_skipped += 1
                errors.append(f"Row {entity.row_index + 1}: Failed to create node")
        except Exception as e:
            error_msg = f"Row {entity.row_index + 1}: {str(e)}"
            errors.append(error_msg)
            nodes_skipped += 1

    return ImportExecuteResponse(
        status="completed" if not errors else "completed_with_errors",
        nodes_created=nodes_created,
        nodes_skipped=nodes_skipped,
        errors=errors[:50],  # Limit to first 50 errors
    )
