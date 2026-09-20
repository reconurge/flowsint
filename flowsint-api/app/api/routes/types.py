from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from flowsint_core.core.models import Profile
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.services import create_type_registry_service

router = APIRouter()


@router.get("")
async def get_types_list(
    flat: bool = False,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Get the complete types list for sketches.

    By default, types are nested under their category. Pass `flat=true`
    to get a single flat list of leaf types (custom types included).
    """
    service = create_type_registry_service(db)
    types: list[dict[str, Any]] = service.get_types_list(current_user.id)
    if flat:
        return [child for category in types for child in category["children"]]
    return types


class DetectRequest(BaseModel):
    text: str


@router.post("/detect")
async def detect_type(
    body: DetectRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
) -> dict[str, Any]:
    """Detect the type of a given text input.

    Returns the detected type and its fields with the primary field pre-filled.
    Falls back to Phrase if no type matches.
    """
    service = create_type_registry_service(db)
    result: dict[str, Any] = service.detect_type(body.text)
    return result
