from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from sqlalchemy import or_
from sqlalchemy.orm import Session
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import Scan, Profile, Sketch, InvestigationUserRole
from flowsint_core.core.types import Role
from app.api.deps import get_current_user
from app.api.schemas.scan import ScanRead
from app.security.permissions import check_investigation_permission

router = APIRouter()


# Get the list of all scans
@router.get(
    "",
    response_model=List[ScanRead],
)
def get_scans(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    # Get all scans from sketches in investigations where user has at least VIEWER role
    allowed_roles_for_read = [Role.OWNER, Role.EDITOR, Role.VIEWER]

    query = db.query(Scan).join(
        Sketch, Sketch.id == Scan.sketch_id
    ).join(
        InvestigationUserRole,
        InvestigationUserRole.investigation_id == Sketch.investigation_id,
    )

    query = query.filter(InvestigationUserRole.user_id == current_user.id)

    # Filter by allowed roles
    conditions = [InvestigationUserRole.roles.any(role) for role in allowed_roles_for_read]
    query = query.filter(or_(*conditions))

    return query.distinct().all()


# Get a scan by ID
@router.get("/{id}", response_model=ScanRead)
def get_scan_by_id(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    scan = db.query(Scan).filter(Scan.id == id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Check investigation permission via sketch
    sketch = db.query(Sketch).filter(Sketch.id == scan.sketch_id).first()
    if sketch:
        check_investigation_permission(
            current_user.id, sketch.investigation_id, actions=["read"], db=db
        )

    return scan


# Delete a scan by ID
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan_by_id(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    scan = db.query(Scan).filter(Scan.id == id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Check investigation permission via sketch
    sketch = db.query(Sketch).filter(Sketch.id == scan.sketch_id).first()
    if sketch:
        check_investigation_permission(
            current_user.id, sketch.investigation_id, actions=["delete"], db=db
        )

    db.delete(scan)
    db.commit()
    return None
