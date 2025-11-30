from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Any, Optional
from pydantic import BaseModel
from flowsint_enrichers import ENRICHER_REGISTRY, load_all_enrichers
from flowsint_core.core.celery import celery
from flowsint_core.core.types import Node, Edge, FlowBranch
from flowsint_core.core.models import CustomType, Profile
from flowsint_core.core.graph_repository import GraphRepository
from flowsint_types import clean_neo4j_node_data
from app.api.deps import get_current_user
from flowsint_core.core.postgre_db import get_db
from sqlalchemy.orm import Session
from sqlalchemy import func

# Auto-discover and register all enrichers
load_all_enrichers()


class FlowComputationRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    inputType: Optional[str] = None


class FlowComputationResponse(BaseModel):
    flowBranches: List[FlowBranch]
    initialData: Any


class StepSimulationRequest(BaseModel):
    flowBranches: List[FlowBranch]
    currentStepIndex: int


class launchEnricherPayload(BaseModel):
    node_ids: List[str]
    sketch_id: str


router = APIRouter()


# Get the list of all enrichers
@router.get("/")
def get_enrichers(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    if not category or category.lower() == "undefined":
        return ENRICHER_REGISTRY.list(exclude=["n8n_connector"])
    # Si catégorie custom
    custom_type = (
        db.query(CustomType)
        .filter(
            CustomType.owner_id == current_user.id,
            CustomType.status == "published",
            func.lower(CustomType.name) == category.lower(),
        )
        .first()
    )

    if custom_type:
        return ENRICHER_REGISTRY.list(exclude=["n8n_connector"], wobbly_type=True)

    return ENRICHER_REGISTRY.list_by_input_type(category, exclude=["n8n_connector"])


@router.post("/{enricher_name}/launch")
async def launch_enricher(
    enricher_name: str,
    payload: launchEnricherPayload,
    current_user: Profile = Depends(get_current_user),
):
    try:
        # Retrieve nodes from Neo4J by their element IDs
        graph_repo = GraphRepository()
        nodes_data = graph_repo.get_nodes_by_ids(payload.node_ids, payload.sketch_id)

        if not nodes_data:
            raise HTTPException(status_code=404, detail="No nodes found with provided IDs")

        # Clean Neo4J-specific fields from node data
        # The enricher's preprocess() will handle Pydantic validation
        cleaned_nodes = [clean_neo4j_node_data(node_data) for node_data in nodes_data]

        task = celery.send_task(
            "run_enricher",
            args=[
                enricher_name,
                cleaned_nodes,
                payload.sketch_id,
                str(current_user.id),
            ],
        )
        return {"id": task.id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error launching enricher: {str(e)}")
