from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from flowsint_core.core.celery import celery
from flowsint_core.core.graph import create_graph_service, GraphEdge, GraphNode
from flowsint_core.core.models import CustomType, Profile
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.types import FlowBranch
from flowsint_enrichers import ENRICHER_REGISTRY, load_all_enrichers
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user

# Auto-discover and register all enrichers
load_all_enrichers()


class FlowComputationRequest(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
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
        graph_service = create_graph_service(sketch_id=payload.sketch_id)
        entities = graph_service.get_nodes_by_ids_for_task(payload.node_ids)

        # send deserialized nodes
        entities = [entity.model_dump(mode="json", serialize_as_any=True) for entity in entities]
        if not entities:
            raise HTTPException(
                status_code=404, detail="No entities found with provided IDs"
            )
        task = celery.send_task(
            "run_enricher",
            args=[
                enricher_name,
                entities,
                payload.sketch_id,
                str(current_user.id),
            ],
        )
        return {"id": task.id}

    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=500, detail=f"Error launching enricher: {str(e)}"
        )
