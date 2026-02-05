from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from sqlalchemy.orm import Session

from flowsint_core.core.types import Role
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import Profile
from flowsint_core.core.services import (
    create_investigation_service,
    NotFoundError,
    PermissionDeniedError,
    DatabaseError,
)
from app.api.deps import get_current_user
from app.api.schemas.investigation import (
    InvestigationRead,
    InvestigationCreate,
    InvestigationUpdate,
)
from app.api.schemas.sketch import SketchRead

router = APIRouter()


@router.get("", response_model=List[InvestigationRead])
def get_investigations(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Get all investigations accessible to the user based on their roles."""
    service = create_investigation_service(db)
    allowed_roles = [Role.OWNER, Role.EDITOR, Role.VIEWER]
    return service.get_accessible_investigations(
        user_id=current_user.id, allowed_roles=allowed_roles
    )


@router.post(
    "/create", response_model=InvestigationRead, status_code=status.HTTP_201_CREATED
)
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_investigation_service(db)
    return service.create(
        name=payload.name,
        description=payload.description,
        owner_id=current_user.id,
    )


@router.get("/{investigation_id}", response_model=InvestigationRead)
def get_investigation_by_id(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_investigation_service(db)
    try:
        return service.get_by_id(investigation_id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Investigation not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/{investigation_id}/sketches", response_model=List[SketchRead])
def get_sketches_by_investigation(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_investigation_service(db)
    try:
        return service.get_sketches(investigation_id, current_user.id)
    except NotFoundError:
        raise HTTPException(
            status_code=404, detail="No sketches found for this investigation"
        )
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.put("/{investigation_id}", response_model=InvestigationRead)
def update_investigation(
    investigation_id: UUID,
    payload: InvestigationUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_investigation_service(db)
    try:
        return service.update(
            investigation_id=investigation_id,
            user_id=current_user.id,
            name=payload.name,
            description=payload.description,
            status=payload.status,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Investigation not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.delete("/{investigation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investigation(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_investigation_service(db)
    try:
        service.delete(investigation_id, current_user.id)
        return None
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Investigation not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except DatabaseError:
        raise HTTPException(status_code=500, detail="Failed to clean up graph data")
