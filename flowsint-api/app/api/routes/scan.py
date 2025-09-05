from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from sqlalchemy.orm import Session
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import Scan, Profile
from app.api.deps import get_current_user
from app.api.schemas.scan import ScanRead

router = APIRouter()


# Get the list of all scans
@router.get(
    "",
    response_model=List[ScanRead],
)
def get_scans(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    scans = db.query(Scan).all()
    return scans


# Get a scan by ID
@router.get("/{id}", response_model=ScanRead)
def get_scan_by_id(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    scan = db.query(Scan).filter(Scan.id == id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Transform not found")
    return scan


# Delete a scan by ID
@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan(db: Session = Depends(get_db)):
    db.query(Scan).delete()
    db.commit()
    return None


# Delete a scan by ID
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    scan = (
        db.query(Scan).filter(Scan.id == id, Scan.owner_id == current_user.id).first()
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    scan = db.query(Scan).filter(Scan.id == id).all()

    # Finally delete the scan
    db.delete(scan)
    db.commit()
    return None
