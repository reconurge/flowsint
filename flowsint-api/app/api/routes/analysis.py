from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from sqlalchemy.orm import Session

from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import Profile
from flowsint_core.core.services import (
    create_analysis_service,
    NotFoundError,
    PermissionDeniedError,
)
from app.api.deps import get_current_user
from app.api.schemas.analysis import AnalysisRead, AnalysisCreate, AnalysisUpdate

router = APIRouter()


@router.get("", response_model=List[AnalysisRead])
def get_analyses(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    """Get all analyses accessible to the current user."""
    service = create_analysis_service(db)
    return service.get_accessible_analyses(current_user.id)


@router.post(
    "/create", response_model=AnalysisRead, status_code=status.HTTP_201_CREATED
)
def create_analysis(
    payload: AnalysisCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_analysis_service(db)
    try:
        return service.create(
            title=payload.title,
            description=payload.description,
            content=payload.content,
            investigation_id=payload.investigation_id,
            owner_id=current_user.id,
        )
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/{analysis_id}", response_model=AnalysisRead)
def get_analysis_by_id(
    analysis_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_analysis_service(db)
    try:
        return service.get_by_id(analysis_id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Analysis not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/investigation/{investigation_id}", response_model=List[AnalysisRead])
def get_analyses_by_investigation(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_analysis_service(db)
    try:
        return service.get_by_investigation(investigation_id, current_user.id)
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.put("/{analysis_id}", response_model=AnalysisRead)
def update_analysis(
    analysis_id: UUID,
    payload: AnalysisUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_analysis_service(db)
    try:
        return service.update(
            analysis_id=analysis_id,
            user_id=current_user.id,
            title=payload.title,
            description=payload.description,
            content=payload.content,
            investigation_id=payload.investigation_id,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Analysis not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(
    analysis_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_analysis_service(db)
    try:
        service.delete(analysis_id, current_user.id)
        return None
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Analysis not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
