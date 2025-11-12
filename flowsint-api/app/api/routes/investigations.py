from uuid import UUID, uuid4
from app.security.permissions import check_investigation_permission
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime
from flowsint_core.core.types import Role
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import (
    Analysis,
    Investigation,
    InvestigationUserRole,
    Profile,
    Sketch,
)
from app.api.deps import get_current_user
from app.api.schemas.investigation import (
    InvestigationRead,
    InvestigationCreate,
    InvestigationUpdate,
)
from app.api.schemas.sketch import SketchRead
from flowsint_core.core.graph_db import neo4j_connection
from flowsint_core.core.graph_repository import GraphRepository

router = APIRouter()


def get_user_accessible_investigations(
    user_id: str, db: Session, allowed_roles: list[Role] = None
) -> list[Investigation]:
    """
    Returns all investigations accessible to user depending on its roles
    """
    query = db.query(Investigation).join(
        InvestigationUserRole,
        InvestigationUserRole.investigation_id == Investigation.id,
    )

    query = query.filter(InvestigationUserRole.user_id == user_id)

    if allowed_roles:
        # ARRAY(Role) contains any of allowed_roles
        conditions = [InvestigationUserRole.roles.any(role) for role in allowed_roles]
        # Inclut également le propriétaire de l’investigation
        query = query.filter(or_(*conditions, Investigation.owner_id == user_id))

    return (
        query.options(
            selectinload(Investigation.sketches),
            selectinload(Investigation.analyses),
            selectinload(Investigation.owner),
        )
        .distinct()
        .all()
    )


# Get the list of all investigations
@router.get("", response_model=List[InvestigationRead])
def get_investigations(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Récupère toutes les investigations accessibles à l'utilisateur
    selon ses rôles (OWNER, EDITOR, VIEWER).
    """
    allowed_roles_for_read = [Role.OWNER, Role.EDITOR, Role.VIEWER]

    investigations = get_user_accessible_investigations(
        user_id=current_user.id, db=db, allowed_roles=allowed_roles_for_read
    )

    return investigations


# Create a new investigation
@router.post(
    "/create", response_model=InvestigationRead, status_code=status.HTTP_201_CREATED
)
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    new_investigation = Investigation(
        id=uuid4(),
        name=payload.name,
        description=payload.description or payload.name,
        owner_id=current_user.id,
        status="active",
    )
    db.add(new_investigation)

    new_roles = InvestigationUserRole(
        id=uuid4(),
        user_id=current_user.id,
        investigation_id=new_investigation.id,
        roles=[Role.OWNER],
    )
    db.add(new_roles)

    db.commit()
    db.refresh(new_investigation)
    db.refresh(new_roles)

    return new_investigation


# Get a investigation by ID
@router.get("/{investigation_id}", response_model=InvestigationRead)
def get_investigation_by_id(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    check_investigation_permission(current_user.id, investigation_id, actions=["read"], db=db)
    investigation = (
        db.query(Investigation)
        .options(
            selectinload(Investigation.sketches),
            selectinload(Investigation.analyses),
            selectinload(Investigation.owner),
        )
        .filter(Investigation.id == investigation_id)
        .filter(Investigation.owner_id == current_user.id)
        .first()
    )
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation


# Get a investigation by ID
@router.get("/{investigation_id}/sketches", response_model=List[SketchRead])
def get_sketches_by_investigation(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    sketches = (
        db.query(Sketch).filter(Sketch.investigation_id == investigation_id).all()
    )
    if not sketches:
        raise HTTPException(
            status_code=404, detail="No sketches found for this investigation"
        )
    return sketches


# Update a investigation by ID
@router.put("/{investigation_id}", response_model=InvestigationRead)
def update_investigation(
    investigation_id: UUID,
    payload: InvestigationUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    investigation = (
        db.query(Investigation).filter(Investigation.id == investigation_id).first()
    )
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    investigation.name = payload.name
    investigation.description = payload.description
    investigation.status = payload.status
    investigation.last_updated_at = datetime.utcnow()

    db.commit()
    db.refresh(investigation)
    return investigation


# Delete a investigation by ID
@router.delete("/{investigation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investigation(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    investigation = (
        db.query(Investigation)
        .filter(
            Investigation.id == investigation_id,
            Investigation.owner_id == current_user.id,
        )
        .first()
    )
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    # Get all sketches related to this investigation
    sketches = (
        db.query(Sketch).filter(Sketch.investigation_id == investigation_id).all()
    )
    analyses = (
        db.query(Analysis).filter(Sketch.investigation_id == investigation_id).all()
    )

    # Delete all nodes and relationships for each sketch in Neo4j using GraphRepository
    graph_repo = GraphRepository(neo4j_connection)
    for sketch in sketches:
        try:
            graph_repo.delete_all_sketch_nodes(str(sketch.id))
        except Exception as e:
            print(f"Neo4j cleanup error for sketch {sketch.id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to clean up graph data")

    # Delete all sketches from PostgreSQL
    for sketch in sketches:
        db.delete(sketch)
    for analysis in analyses:
        db.delete(analysis)

    # Finally delete the investigation
    db.delete(investigation)
    db.commit()
    return None
