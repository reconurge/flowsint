from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from flowsint_core.core.celery import celery
from flowsint_core.core.graph import create_graph_service
from flowsint_core.core.models import Profile
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.services import create_enricher_service
from flowsint_enrichers import ENRICHER_REGISTRY, load_all_enrichers
from app.api.deps import get_current_user

load_all_enrichers()


class launchEnricherPayload(BaseModel):
    node_ids: List[str]
    sketch_id: str


router = APIRouter()


@router.get("/")
def get_enrichers(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Get all enrichers, optionally filtered by category."""
    service = create_enricher_service(db)
    return service.get_enrichers(category, current_user.id, ENRICHER_REGISTRY)


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

        # Send deserialized nodes
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
