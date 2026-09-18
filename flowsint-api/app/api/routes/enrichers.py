from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from flowsint_core.core.celery import celery
from flowsint_core.core.graph import create_graph_service
from flowsint_core.core.models import Profile
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.services import (
    create_enricher_service,
    create_enricher_template_service,
)
from flowsint_core.core.services.type_registry_service import (
    create_type_registry_service,
)
from flowsint_enrichers import ENRICHER_REGISTRY, load_all_enrichers

load_all_enrichers()


class launchEnricherPayload(BaseModel):
    node_ids: List[str]
    sketch_id: str
    # Left loose on purpose: the enricher's own ParamsModel (built from its
    # params_schema) is what actually validates these, and it differs per
    # enricher, so constraining the shape here would only reject values the
    # enricher would have accepted.
    params: Optional[Dict[str, Any]] = None


router = APIRouter()


# response_model=None is load-bearing: this endpoint mixes registry dicts with
# EnricherTemplate ORM rows, and a return annotation alone would make FastAPI
# adopt it as a response model, which pydantic cannot serialize the rows
# through. The annotation exists for mypy, not for the wire format.
@router.get("", response_model=None)
def get_enrichers(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
) -> list:
    """Get all enrichers, optionally filtered by category."""
    enricher_service = create_enricher_service(db)
    enrichers: list = enricher_service.get_all_enrichers(
        category, current_user.id, ENRICHER_REGISTRY
    )
    return enrichers


@router.post("/{enricher_name}/launch")
async def launch_enricher(
    enricher_name: str,
    payload: launchEnricherPayload,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    try:
        # Retrieve nodes from Neo4J by their element IDs
        type_registry = create_type_registry_service(db)
        resolver = type_registry.build_type_resolver(current_user.id)
        graph_service = create_graph_service(
            sketch_id=payload.sketch_id, type_resolver=resolver
        )
        entities = graph_service.get_nodes_by_ids_for_task(payload.node_ids)

        # Send deserialized nodes
        entities = [
            entity.model_dump(mode="json", serialize_as_any=True) for entity in entities
        ]
        if not entities:
            raise HTTPException(
                status_code=404, detail="No entities found with provided IDs"
            )

        is_template = False
        enricher_in_registry = ENRICHER_REGISTRY.enricher_exists(enricher_name)
        if not enricher_in_registry:
            template_service = create_enricher_template_service(db)
            template = template_service.find_by_name(enricher_name, current_user.id)
            if not template:
                raise HTTPException(
                    status_code=404,
                    detail=f"Enricher '{enricher_name}' not found",
                )
            is_template = True

        task_name = "run_template_enricher" if is_template else "run_enricher"
        task = celery.send_task(
            task_name,
            args=[
                enricher_name,
                entities,
                payload.sketch_id,
                str(current_user.id),
            ],
            # Keyword rather than a 5th positional arg so the positional
            # signature stays byte-identical to what older API instances queue:
            # a message already in flight still binds cleanly against the new
            # task. (Workers still have to roll out before the API either way —
            # a worker predating `params` rejects the keyword.)
            kwargs={"params": payload.params or {}},
        )
        return {"id": task.id}

    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=500, detail=f"Error launching enricher: {str(e)}"
        )
