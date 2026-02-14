"""API routes for custom types management."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from flowsint_core.core.models import Profile
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.services import (
    ConflictError,
    NotFoundError,
    ValidationError,
    create_custom_type_service,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.custom_type import (
    CustomTypeCreate,
    CustomTypeRead,
    CustomTypeUpdate,
    CustomTypeValidatePayload,
    CustomTypeValidateResponse,
)
from app.utils.custom_types import (
    calculate_schema_checksum,
    validate_json_schema,
    validate_payload_against_schema,
)

router = APIRouter()


@router.post("", response_model=CustomTypeRead, status_code=status.HTTP_201_CREATED)
def create_custom_type(
    custom_type: CustomTypeCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Create a new custom type."""
    service = create_custom_type_service(db)
    try:
        return service.create(
            name=custom_type.name,
            json_schema=custom_type.json_schema,
            user_id=current_user.id,
            description=custom_type.description,
            status=custom_type.status,
            validate_schema_func=validate_json_schema,
            calculate_checksum_func=calculate_schema_checksum,
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[CustomTypeRead])
def list_custom_types(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """List all custom types for the current user."""
    service = create_custom_type_service(db)
    try:
        return service.list_custom_types(current_user.id, status)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{id}", response_model=CustomTypeRead)
def get_custom_type(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Get a specific custom type by ID."""
    service = create_custom_type_service(db)
    try:
        return service.get_by_id(id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Custom type not found")


@router.get("/{id}/schema")
def get_custom_type_schema(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Get the raw JSON Schema for a custom type."""
    service = create_custom_type_service(db)
    try:
        return service.get_schema(id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Custom type not found")


@router.put("/{id}", response_model=CustomTypeRead)
def update_custom_type(
    id: UUID,
    update_data: CustomTypeUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Update a custom type."""
    service = create_custom_type_service(db)
    try:
        return service.update(
            custom_type_id=id,
            user_id=current_user.id,
            name=update_data.name,
            icon=update_data.icon,
            color=update_data.color,
            json_schema=update_data.json_schema,
            description=update_data.description,
            status=update_data.status,
            validate_schema_func=validate_json_schema,
            calculate_checksum_func=calculate_schema_checksum,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Custom type not found")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_type(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Delete a custom type."""
    service = create_custom_type_service(db)
    try:
        service.delete(id, current_user.id)
        return None
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Custom type not found")


@router.post("/{id}/validate", response_model=CustomTypeValidateResponse)
def validate_payload(
    id: UUID,
    payload_data: CustomTypeValidatePayload,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Validate a payload against a custom type's schema."""
    service = create_custom_type_service(db)
    try:
        is_valid, errors = service.validate_payload(
            id,
            current_user.id,
            payload_data.payload,
            validate_payload_func=validate_payload_against_schema,
        )
        return CustomTypeValidateResponse(
            valid=is_valid,
            errors=errors if not is_valid else None,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Custom type not found")
