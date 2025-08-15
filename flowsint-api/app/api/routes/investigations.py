from uuid import UUID, uuid4
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime
from sqlalchemy.orm import Session, selectinload
from flowsint_core.core.postgre_db import get_db
from app.models.models import Analysis, Investigation, Profile, Sketch
from app.api.deps import get_current_user
from app.api.schemas.investigation import (
    InvestigationRead,
    InvestigationCreate,
    InvestigationUpdate,
)
from app.api.schemas.sketch import SketchRead
from flowsint_core.core.graph_db import neo4j_connection

router = APIRouter()


# Get the list of all investigations
@router.get("", response_model=List[InvestigationRead])
def get_investigations(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    investigations = (
        db.query(Investigation)
        .options(selectinload(Investigation.sketches), selectinload(Investigation.analyses), selectinload(Investigation.owner))
        .filter(Investigation.owner_id == current_user.id)
        .all()
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
        created_at=datetime.utcnow(),
        last_updated_at=datetime.utcnow(),
    )
    db.add(new_investigation)
    db.commit()
    db.refresh(new_investigation)
    return new_investigation


# Get a investigation by ID
@router.get("/{investigation_id}", response_model=InvestigationRead)
def get_investigation_by_id(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    investigation = (
        db.query(Investigation)
        .options(selectinload(Investigation.sketches), selectinload(Investigation.analyses), selectinload(Investigation.owner))
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

    # Delete all nodes and relationships for each sketch in Neo4j
    for sketch in sketches:
        neo4j_query = """
        MATCH (n {sketch_id: $sketch_id})
        DETACH DELETE n
        """
        try:
            neo4j_connection.query(neo4j_query, {"sketch_id": str(sketch.id)})
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
