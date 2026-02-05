from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from sqlalchemy.orm import Session

from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import Profile
from flowsint_core.core.services import (
    create_scan_service,
    NotFoundError,
    PermissionDeniedError,
)
from app.api.deps import get_current_user
from app.api.schemas.scan import ScanRead

router = APIRouter()


@router.get("", response_model=List[ScanRead])
def get_scans(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    """Get all scans accessible to the current user."""
    service = create_scan_service(db)
    return service.get_accessible_scans(current_user.id)


@router.get("/{id}", response_model=ScanRead)
def get_scan_by_id(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_scan_service(db)
    try:
        return service.get_by_id(id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Scan not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan_by_id(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_scan_service(db)
    try:
        service.delete(id, current_user.id)
        return None
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Scan not found")
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
