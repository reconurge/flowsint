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
    ConflictError,
    DatabaseError,
)
from app.api.deps import get_current_user
from app.api.schemas.investigation import (
    InvestigationRead,
    InvestigationCreate,
    InvestigationUpdate,
    CollaboratorAdd,
    CollaboratorUpdate,
    CollaboratorRead,
)
from app.api.schemas.sketch import SketchRead

router = APIRouter()


def _inject_current_user_role(service, investigation, user_id) -> InvestigationRead:
    """Build InvestigationRead with the current user's role attached."""
    result = InvestigationRead.model_validate(investigation)
    role_entry = service.get_user_role_for_investigation(user_id, investigation.id)
    if role_entry and role_entry.roles:
        result.current_user_role = role_entry.roles[0].value
    return result


@router.get("", response_model=List[InvestigationRead])
def get_investigations(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Get all investigations accessible to the user based on their roles."""
    service = create_investigation_service(db)
    allowed_roles = [Role.OWNER, Role.ADMIN, Role.EDITOR, Role.VIEWER]
    investigations = service.get_accessible_investigations(
        user_id=current_user.id, allowed_roles=allowed_roles
    )
    return [
        _inject_current_user_role(service, inv, current_user.id)
        for inv in investigations
    ]


@router.post(
    "/create", response_model=InvestigationRead, status_code=status.HTTP_201_CREATED
)
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_investigation_service(db)
    investigation = service.create(
        name=payload.name,
        description=payload.description,
        owner_id=current_user.id,
    )
    return _inject_current_user_role(service, investigation, current_user.id)


@router.get("/{investigation_id}", response_model=InvestigationRead)
def get_investigation_by_id(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_investigation_service(db)
    try:
        investigation = service.get_by_id(investigation_id, current_user.id)
        return _inject_current_user_role(service, investigation, current_user.id)
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
        investigation = service.update(
            investigation_id=investigation_id,
            user_id=current_user.id,
            name=payload.name,
            description=payload.description,
            status=payload.status,
        )
        return _inject_current_user_role(service, investigation, current_user.id)
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


# ── Collaborator endpoints ───────────────────────────────────────────


@router.get(
    "/{investigation_id}/collaborators", response_model=List[CollaboratorRead]
)
def get_collaborators(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_investigation_service(db)
    try:
        entries = service.get_collaborators(investigation_id, current_user.id)
        return [
            CollaboratorRead(
                id=e.id,
                user_id=e.user_id,
                roles=[r.value for r in e.roles],
                user=e.user,
            )
            for e in entries
        ]
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post(
    "/{investigation_id}/collaborators",
    response_model=CollaboratorRead,
    status_code=status.HTTP_201_CREATED,
)
def add_collaborator(
    investigation_id: UUID,
    payload: CollaboratorAdd,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_investigation_service(db)
    try:
        role = Role(payload.role.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")
    try:
        entry = service.add_collaborator(
            investigation_id=investigation_id,
            user_id=current_user.id,
            target_email=payload.email,
            role=role,
        )
        return CollaboratorRead(
            id=entry.id,
            user_id=entry.user_id,
            roles=[r.value for r in entry.roles],
            user=entry.user,
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e.message))
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except ConflictError:
        raise HTTPException(status_code=409, detail="User is already a collaborator")


@router.put(
    "/{investigation_id}/collaborators/{user_id}",
    response_model=CollaboratorRead,
)
def update_collaborator_role(
    investigation_id: UUID,
    user_id: UUID,
    payload: CollaboratorUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_investigation_service(db)
    try:
        role = Role(payload.role.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")
    try:
        entry = service.update_collaborator_role(
            investigation_id=investigation_id,
            user_id=current_user.id,
            target_user_id=user_id,
            role=role,
        )
        return CollaboratorRead(
            id=entry.id,
            user_id=entry.user_id,
            roles=[r.value for r in entry.roles],
            user=entry.user,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.delete(
    "/{investigation_id}/collaborators/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_collaborator(
    investigation_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_investigation_service(db)
    try:
        service.remove_collaborator(
            investigation_id=investigation_id,
            user_id=current_user.id,
            target_user_id=user_id,
        )
        return None
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
