from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from flowsint_core.core.models import Profile
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.services import create_type_registry_service
from app.api.deps import get_current_user

router = APIRouter()


@router.get("")
async def get_types_list(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    """Get the complete types list for sketches."""
    service = create_type_registry_service(db)
    return service.get_types_list(current_user.id)
