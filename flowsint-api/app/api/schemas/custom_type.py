from typing import Optional, Dict, Any
from pydantic import BaseModel, UUID4, Field, field_validator
from datetime import datetime
from .base import ORMBase


class CustomTypeCreate(BaseModel):
    """Schema for creating a new custom type."""
    name: str = Field(..., min_length=1, max_length=255, description="Name of the custom type")
    json_schema: Dict[str, Any] = Field(..., description="JSON Schema definition", alias="schema")
    description: Optional[str] = Field(None, description="Optional description of the custom type")
    status: Optional[str] = Field("draft", description="Status: draft or published")

    class Config:
        populate_by_name = True

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ["draft", "published", "archived"]:
            raise ValueError("Status must be one of: draft, published, archived")
        return v


class CustomTypeUpdate(BaseModel):
    """Schema for updating an existing custom type."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    json_schema: Optional[Dict[str, Any]] = Field(None, alias="schema")
    description: Optional[str] = None
    status: Optional[str] = None

    class Config:
        populate_by_name = True

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ["draft", "published", "archived"]:
            raise ValueError("Status must be one of: draft, published, archived")
        return v


class CustomTypeRead(ORMBase):
    """Schema for reading a custom type."""
    id: UUID4
    name: str
    owner_id: UUID4
    json_schema: Dict[str, Any] = Field(..., alias="schema")
    status: str
    checksum: Optional[str]
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class CustomTypeValidatePayload(BaseModel):
    """Schema for validating a payload against a custom type schema."""
    payload: Dict[str, Any] = Field(..., description="Data to validate against the schema")


class CustomTypeValidateResponse(BaseModel):
    """Response schema for validation."""
    valid: bool
    errors: Optional[list[str]] = None
