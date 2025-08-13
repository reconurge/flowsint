from uuid import UUID, uuid4
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime
from sqlalchemy.orm import Session
from flowsint_core.core.postgre_db import get_db
from app.models.models import Analysis, Profile
from app.api.deps import get_current_user
from app.api.schemas.analysis import AnalysisRead, AnalysisCreate, AnalysisUpdate

router = APIRouter()

# Get the list of all analyses for the current user
@router.get("", response_model=List[AnalysisRead])
def get_analyses(db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    analyses = db.query(Analysis).filter(Analysis.owner_id == current_user.id).all()
    return analyses

# Create a new analysis
@router.post("/create", response_model=AnalysisRead, status_code=status.HTTP_201_CREATED)
def create_analysis(payload: AnalysisCreate, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    new_analysis = Analysis(
        id=uuid4(),
        title=payload.title,
        description=payload.description,
        content=payload.content,
        owner_id=current_user.id,
        investigation_id=payload.investigation_id,
        created_at=datetime.utcnow(),
        last_updated_at=datetime.utcnow(),
    )
    db.add(new_analysis)
    db.commit()
    db.refresh(new_analysis)
    return new_analysis

# Get an analysis by ID
@router.get("/{analysis_id}", response_model=AnalysisRead)
def get_analysis_by_id(analysis_id: UUID, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.owner_id == current_user.id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis

# Get analyses by investigation ID
@router.get("/investigation/{investigation_id}", response_model=List[AnalysisRead])
def get_analyses_by_investigation(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    analyses = db.query(Analysis).filter(
        Analysis.investigation_id == investigation_id,
        Analysis.owner_id == current_user.id
    ).all()
    return analyses

# Update an analysis by ID
@router.put("/{analysis_id}", response_model=AnalysisRead)
def update_analysis(analysis_id: UUID, payload: AnalysisUpdate, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.owner_id == current_user.id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if payload.title is not None:
        analysis.title = payload.title
    if payload.description is not None:
        analysis.description = payload.description
    if payload.content is not None:
        analysis.content = payload.content
    if payload.investigation_id is not None:
        analysis.investigation_id = payload.investigation_id
    analysis.last_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(analysis)
    return analysis

# Delete an analysis by ID
@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(analysis_id: UUID, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.owner_id == current_user.id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    db.delete(analysis)
    db.commit()
    return None 
