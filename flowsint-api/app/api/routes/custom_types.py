"""API routes for custom types management."""
from uuid import UUID
from typing import List
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import CustomType, Profile
from app.api.deps import get_current_user
from app.api.schemas.custom_type import (
    CustomTypeCreate,
    CustomTypeUpdate,
    CustomTypeRead,
    CustomTypeValidatePayload,
    CustomTypeValidateResponse,
)
from app.utils.custom_types import (
    validate_json_schema,
    validate_payload_against_schema,
    calculate_schema_checksum,
)


router = APIRouter()


@router.post("", response_model=CustomTypeRead, status_code=status.HTTP_201_CREATED)
def create_custom_type(
    custom_type: CustomTypeCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Create a new custom type.

    Validates the JSON Schema and stores it in the database.
    """
    # Validate the JSON Schema
    validate_json_schema(custom_type.json_schema)

    # Calculate checksum
    checksum = calculate_schema_checksum(custom_type.json_schema)

    # Check for duplicate name for this user
    existing = (
        db.query(CustomType)
        .filter(
            CustomType.owner_id == current_user.id,
            CustomType.name == custom_type.name
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Custom type with name '{custom_type.name}' already exists"
        )

    # Create the custom type
    db_custom_type = CustomType(
        name=custom_type.name,
        owner_id=current_user.id,
        schema=custom_type.json_schema,
        description=custom_type.description,
        status=custom_type.status,
        checksum=checksum,
    )

    db.add(db_custom_type)
    db.commit()
    db.refresh(db_custom_type)

    return db_custom_type


@router.get("", response_model=List[CustomTypeRead])
def list_custom_types(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    List all custom types for the current user.

    Can be filtered by status (draft, published, archived).
    """
    query = db.query(CustomType).filter(CustomType.owner_id == current_user.id)

    if status:
        if status not in ["draft", "published", "archived"]:
            raise HTTPException(
                status_code=400,
                detail="Status must be one of: draft, published, archived"
            )
        query = query.filter(CustomType.status == status)

    custom_types = query.order_by(CustomType.created_at.desc()).all()
    return custom_types


@router.get("/{id}", response_model=CustomTypeRead)
def get_custom_type(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Get a specific custom type by ID."""
    custom_type = (
        db.query(CustomType)
        .filter(CustomType.id == id, CustomType.owner_id == current_user.id)
        .first()
    )

    if not custom_type:
        raise HTTPException(
            status_code=404,
            detail="Custom type not found"
        )

    return custom_type


@router.get("/{id}/schema")
def get_custom_type_schema(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Get the raw JSON Schema for a custom type."""
    custom_type = (
        db.query(CustomType)
        .filter(CustomType.id == id, CustomType.owner_id == current_user.id)
        .first()
    )

    if not custom_type:
        raise HTTPException(
            status_code=404,
            detail="Custom type not found"
        )

    return custom_type.schema


@router.put("/{id}", response_model=CustomTypeRead)
def update_custom_type(
    id: UUID,
    update_data: CustomTypeUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Update a custom type.

    If the schema is changed, a new checksum is calculated.
    """
    custom_type = (
        db.query(CustomType)
        .filter(CustomType.id == id, CustomType.owner_id == current_user.id)
        .first()
    )

    if not custom_type:
        raise HTTPException(
            status_code=404,
            detail="Custom type not found"
        )

    # Update fields
    if update_data.name is not None:
        # Check for duplicate name
        existing = (
            db.query(CustomType)
            .filter(
                CustomType.owner_id == current_user.id,
                CustomType.name == update_data.name,
                CustomType.id != id
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Custom type with name '{update_data.name}' already exists"
            )
        custom_type.name = update_data.name

    if update_data.json_schema is not None:
        # Validate the new schema
        validate_json_schema(update_data.json_schema)
        custom_type.schema = update_data.json_schema
        custom_type.checksum = calculate_schema_checksum(update_data.json_schema)

    if update_data.description is not None:
        custom_type.description = update_data.description

    if update_data.status is not None:
        custom_type.status = update_data.status

    db.commit()
    db.refresh(custom_type)

    return custom_type


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_type(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Delete a custom type."""
    custom_type = (
        db.query(CustomType)
        .filter(CustomType.id == id, CustomType.owner_id == current_user.id)
        .first()
    )

    if not custom_type:
        raise HTTPException(
            status_code=404,
            detail="Custom type not found"
        )

    db.delete(custom_type)
    db.commit()

    return None


@router.post("/{id}/validate", response_model=CustomTypeValidateResponse)
def validate_payload(
    id: UUID,
    payload_data: CustomTypeValidatePayload,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Validate a payload against a custom type's schema.

    This is useful for testing before publishing a type.
    """
    custom_type = (
        db.query(CustomType)
        .filter(CustomType.id == id, CustomType.owner_id == current_user.id)
        .first()
    )

    if not custom_type:
        raise HTTPException(
            status_code=404,
            detail="Custom type not found"
        )

    # Validate the payload against the schema
    is_valid, errors = validate_payload_against_schema(
        payload_data.payload,
        custom_type.schema
    )

    return CustomTypeValidateResponse(
        valid=is_valid,
        errors=errors if not is_valid else None
    )
