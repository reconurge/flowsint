"""Pydantic schemas for enricher templates."""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import UUID4, BaseModel, Field, field_validator

from .base import ORMBase


class EnricherTemplateCreate(BaseModel):
    """Schema for creating a new enricher template."""

    name: str = Field(
        ..., min_length=1, max_length=255, description="Name of the template"
    )
    description: Optional[str] = Field(
        None, max_length=1000, description="Description of the template"
    )
    category: str = Field(
        ..., min_length=1, max_length=100, description="Category (e.g., Ip, Domain)"
    )
    version: float = Field(default=1.0, ge=0, description="Template version")
    content: Dict[str, Any] = Field(
        ..., description="Template content as parsed YAML/JSON"
    )
    is_public: bool = Field(
        default=False, description="Whether the template is publicly visible"
    )

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that content has required template fields."""
        required_fields = [
            "name",
            "category",
            "version",
            "input",
            "request",
            "output",
            "response",
        ]
        missing = [f for f in required_fields if f not in v]
        if missing:
            raise ValueError(
                f"Missing required fields in content: {', '.join(missing)}"
            )

        # Validate input
        if "input" in v and "type" not in v.get("input", {}):
            raise ValueError("input.type is required")

        # Validate request
        request = v.get("request", {})
        if "method" not in request:
            raise ValueError("request.method is required")
        if request.get("method") not in ["GET", "POST"]:
            raise ValueError("request.method must be GET or POST")
        if "url" not in request:
            raise ValueError("request.url is required")

        # Validate output
        if "output" in v and "type" not in v.get("output", {}):
            raise ValueError("output.type is required")

        # Validate response
        response = v.get("response", {})
        if "expect" not in response:
            raise ValueError("response.expect is required")
        if response.get("expect") not in ["json", "xml", "text"]:
            raise ValueError("response.expect must be json, xml, or text")

        return v


class EnricherTemplateUpdate(BaseModel):
    """Schema for updating an existing enricher template."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    version: Optional[float] = Field(None, ge=0)
    content: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Validate content if provided."""
        if v is None:
            return v

        required_fields = [
            "name",
            "category",
            "version",
            "input",
            "request",
            "output",
            "response",
        ]
        missing = [f for f in required_fields if f not in v]
        if missing:
            raise ValueError(
                f"Missing required fields in content: {', '.join(missing)}"
            )

        return v


class EnricherTemplateRead(ORMBase):
    """Schema for reading an enricher template."""

    id: UUID4
    name: str
    description: Optional[str]
    category: str
    version: float
    content: Dict[str, Any]
    is_public: bool
    owner_id: UUID4
    created_at: datetime
    updated_at: datetime


class EnricherTemplateList(ORMBase):
    """Schema for listing enricher templates (minimal fields)."""

    id: UUID4
    name: str
    description: Optional[str]
    category: str
    version: float
    is_public: bool
    owner_id: UUID4
    created_at: datetime
    updated_at: datetime


class EnricherTemplateTestRequest(BaseModel):
    """Schema for testing an enricher template by ID."""

    input_value: str = Field(
        ..., min_length=1, description="The value to test the template with"
    )


class EnricherTemplateTestContentRequest(BaseModel):
    """Schema for testing template content directly (without saving)."""

    input_value: str = Field(
        ..., min_length=1, description="The value to test the template with"
    )
    content: Dict[str, Any] = Field(..., description="Template content to test")


class EnricherTemplateTestResponse(BaseModel):
    """Schema for test response."""

    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    status_code: Optional[int] = None
    url: str


class EnricherTemplateGenerateRequest(BaseModel):
    """Schema for AI-assisted template generation."""

    prompt: str = Field(
        ...,
        min_length=10,
        max_length=16000,
        description="Free-text description of the desired enricher template",
    )


class EnricherTemplateGenerateResponse(BaseModel):
    """Schema for the generated template response."""

    yaml_content: str = Field(
        ..., description="Raw YAML string of the generated template"
    )
