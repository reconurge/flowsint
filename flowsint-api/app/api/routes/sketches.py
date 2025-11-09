from app.security.permissions import check_investigation_permission
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Literal, List, Optional, Dict, Any
from flowsint_core.utils import flatten
from sqlalchemy.orm import Session
from app.api.schemas.sketch import SketchCreate, SketchRead, SketchUpdate
from flowsint_core.core.models import Sketch, Profile
from uuid import UUID
from flowsint_core.core.graph_db import neo4j_connection
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
        .filter(Sketch.owner_id == current_user.id)
        .filter(Sketch.id == id)
        .first()
    )
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
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
        .filter(Sketch.id == id, Sketch.owner_id == current_user.id)
        .first()
    )
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
async def get_sketch_nodes(
    id: str,
    format: str = None,
    db: Session = Depends(get_db),
    # current_user: Profile = Depends(get_current_user)
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
        .filter(
            Sketch.id == id,
            #  Sketch.owner_id == current_user.id
        )
        .first()
    )
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
    current_user: Profile = Depends(get_current_user)
):
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

    query = f"""
        MATCH (a) WHERE elementId(a) = $from_id
        MATCH (b) WHERE elementId(b) = $to_id
        MERGE (a)-[r:`{relation.label}` {{sketch_id: $sketch_id}}]->(b)
        RETURN r
    """

    params = {
        "from_id": relation.source,
        "to_id": relation.target,
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

    params = {"node_id": node_edit.nodeId, "sketch_id": sketch_id, **properties}

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

    # Delete nodes and their relationships
    query = """
    UNWIND $node_ids AS node_id
    MATCH (n)
    WHERE elementId(n) = node_id AND n.sketch_id = $sketch_id
    DETACH DELETE n
    """

    try:
        neo4j_connection.query(
            query, {"node_ids": nodes.nodeIds, "sketch_id": sketch_id}
        )
    except Exception as e:
        print(f"Node deletion error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete nodes")

    return {"status": "nodes deleted", "count": len(nodes.nodeIds)}


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
    # 1. Vérifier le sketch
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")

    oldNodeIds = [id for id in oldNodes]

    # 2. Préparer le node unique (utiliser nodeId)
    node_id = getattr(newNode, "id", None)
    if not node_id:
        raise HTTPException(status_code=400, detail="newNode.id is required")

    properties = {}
    if newNode.data:
        flattened_data = flatten(newNode.data.dict())
        properties.update(flattened_data)

    cypher_props = dict_to_cypher_props(properties)
    node_type = getattr(newNode, "type", "Node")

    # 3. Créer ou merger le nouveau node
    create_query = f"""
    MERGE (new:`{node_type}` {{nodeId: $nodeId}})
    SET new += $nodeData
    RETURN elementId(new) as newElementId
    """
    try:
        result = neo4j_connection.query(
            create_query, {"nodeId": node_id, "nodeData": cypher_props}
        )
        new_node_element_id = result[0]["newElementId"]
    except Exception as e:
        print(f"Error creating/merging new node: {e}")
        raise HTTPException(status_code=500, detail="Failed to create new node")

    # 4. Récupérer tous les types de relations des oldNodes
    rel_types_query = """
    MATCH (old)
    WHERE elementId(old) IN $oldNodeIds AND old.sketch_id = $sketch_id
    MATCH (old)-[r]-()
    RETURN DISTINCT type(r) AS relType
    """
    try:
        rel_types_result = neo4j_connection.query(
            rel_types_query, {"oldNodeIds": oldNodeIds, "sketch_id": sketch_id}
        )
        rel_types = [row["relType"] for row in rel_types_result] or []
    except Exception as e:
        print(f"Error fetching relation types: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch relation types")

    # 5. Construire la query pour copier les relations
    blocks = []
    for rel_type in rel_types:
        block = f"""
        // Relations entrantes
        MATCH (new) WHERE elementId(new) = $newElementId
        MATCH (old) WHERE elementId(old) IN $oldNodeIds
        OPTIONAL MATCH (src)-[r:`{rel_type}`]->(old)
        WITH src, new, r WHERE src IS NOT NULL
        MERGE (src)-[newRel:`{rel_type}`]->(new)
        ON CREATE SET newRel = r
        ON MATCH SET newRel += r
        WITH DISTINCT new

        // Relations sortantes
        MATCH (new) WHERE elementId(new) = $newElementId
        MATCH (old) WHERE elementId(old) IN $oldNodeIds
        OPTIONAL MATCH (old)-[r:`{rel_type}`]->(dst)
        WITH dst, new, r WHERE dst IS NOT NULL
        MERGE (new)-[newRel2:`{rel_type}`]->(dst)
        ON CREATE SET newRel2 = r
        ON MATCH SET newRel2 += r
        WITH DISTINCT new
        """
        blocks.append(block)

    # 6. Supprimer les anciens nodes
    delete_query = """
    MATCH (old)
    WHERE elementId(old) IN $oldNodeIds
    DETACH DELETE old
    """

    full_query = "\n".join(blocks) + delete_query

    # 7. Exécuter la query
    try:
        neo4j_connection.query(
            full_query, {"newElementId": new_node_element_id, "oldNodeIds": oldNodeIds}
        )
    except Exception as e:
        print(f"Node merging error: {e}")
        raise HTTPException(status_code=500, detail="Failed to merge node relations")

    return {"status": "nodes merged", "count": len(oldNodeIds)}


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
        if record["other_node_id"] and record["other_node_id"] not in seen_nodes:
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
        .filter(Sketch.id == sketch_id, Sketch.owner_id == current_user.id)
        .first()
    )
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to read file: {str(e)}"
        )

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
        raise HTTPException(
            status_code=500, detail=f"Failed to parse file: {str(e)}"
        )

    # Convert entities to response models (no slicing)
    entity_previews = [
        EntityPreviewModel(
            row_index=e.row_index,
            data=e.data,
            detected_type=e.detected_type,
            primary_value=e.primary_value,
            confidence=e.confidence
        )
        for e in result.entities
    ]

    return AnalyzeFileResponse(
        entities=entity_previews,
        total_entities=result.total_entities,
        type_distribution=result.type_distribution,
        columns=result.columns
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
        .filter(Sketch.id == sketch_id, Sketch.owner_id == current_user.id)
        .first()
    )
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")

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
        raise HTTPException(
            status_code=500, detail=f"Failed to parse file: {str(e)}"
        )

    # Create mapping lookup by row index
    mappings_by_row = {
        m.row_index: m for m in entity_mappings if m.include
    }

    # Import entities
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

        # Create node properties with all data
        properties = {
            "type": entity_type.lower(),
            "sketch_id": sketch_id,
            "label": label,
            "caption": label,
            **entity_data,  # Include all row data (edited or original) as properties
        }

        # Flatten nested dicts if any
        flattened_props = flatten(properties)

        # Create node in Neo4j
        create_query = f"""
            MERGE (n:`{entity_type}` {{sketch_id: $sketch_id, label: $label}})
            ON CREATE SET n += $props
            RETURN elementId(n) as id
        """

        try:
            neo4j_connection.query(
                create_query,
                {"sketch_id": sketch_id, "label": label, "props": flattened_props}
            )
            nodes_created += 1
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
