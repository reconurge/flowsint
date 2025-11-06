from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Any, Optional
from pydantic import BaseModel
from flowsint_core.core.registry import TransformRegistry
from flowsint_core.core.celery import celery
from flowsint_core.core.types import Node, Edge, FlowBranch
from flowsint_core.core.models import CustomType, Profile
from app.api.deps import get_current_user
from flowsint_core.core.postgre_db import get_db
from sqlalchemy.orm import Session
from sqlalchemy import func


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


class launchTransformPayload(BaseModel):
    values: List[str]
    sketch_id: str


router = APIRouter()


# Get the list of all transforms
@router.get("/")
def get_transforms(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    if not category or category.lower() == "undefined":
        return TransformRegistry.list(exclude=["n8n_connector"])
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
        return TransformRegistry.list(exclude=["n8n_connector"], wobbly_type=True)

    return TransformRegistry.list_by_input_type(category, exclude=["n8n_connector"])


@router.post("/{transform_name}/launch")
async def launch_transform(
    transform_name: str,
    payload: launchTransformPayload,
    current_user: Profile = Depends(get_current_user),
):
    try:
        task = celery.send_task(
            "run_transform",
            args=[
                transform_name,
                payload.values,
                payload.sketch_id,
                str(current_user.id),
            ],
        )
        return {"id": task.id}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Transform not found")
