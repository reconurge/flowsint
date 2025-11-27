from pydantic import Field, EmailStr, model_validator
from typing import Any, Self
from .flowsint_base import FlowsintType


class Email(FlowsintType):
    """Represents an email address."""

    email: EmailStr = Field(..., description="Email address", title="Email Address", json_schema_extra={"primary": True})

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        self.label = self.email
        return self
