from pydantic import Field, EmailStr, model_validator
from typing import Any, Self
import re
from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class Email(FlowsintType):
    """Represents an email address."""

    email: EmailStr = Field(..., description="Email address", title="Email Address", json_schema_extra={"primary": True})

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        self.nodeLabel = self.email
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse an email from a raw string."""
        return cls(email=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        """Detect if a line of text contains an email address."""
        line = line.strip()
        if not line:
            return False

        # Email regex pattern (RFC 5322 simplified)
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, line))
