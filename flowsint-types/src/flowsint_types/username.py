from pydantic import Field, field_validator, model_validator
from typing import Optional, Any, Self
import re
from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class Username(FlowsintType):
    """Represents a username or handle on any platform."""

    value: str = Field(
        ...,
        description="Username or handle string",
        title="Username value",
        json_schema_extra={"primary": True},
    )
    platform: Optional[str] = Field(
        None, description="Platform name, e.g., 'twitter'", title="Username platform"
    )
    last_seen: Optional[str] = Field(
        None, description="Last time this username was observed", title="Last seen at"
    )

    @field_validator("value")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate username format.

        Username must be 3-80 characters long and contain only:
        - Letters (a-z, A-Z)
        - Numbers (0-9)
        - Underscores (_)
        - Hyphens (-)
        """
        if v.startswith("@"):
            v = v[1:] # We remove it
        if not re.match(r"^[a-zA-Z0-9_-]{3,80}$", v):
            raise ValueError(
                f"Invalid username: {v}. Must be 3-80 characters and contain only letters, numbers, underscores, and hyphens."
            )
        return v

    @model_validator(mode="after")
    def compute_label(self) -> Self:
        self.label = f"{self.value}"
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse a username from a raw string."""
        return cls(value=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        """Detect if a line of text contains a username."""
        line = line.strip()
        if not line:
            return False

        # Username pattern: 3-80 characters, only letters, numbers, underscores, hyphens
        # Note: This is intentionally restrictive to avoid false positives
        return bool(re.match(r"^[a-zA-Z0-9_-]{3,80}$", line))
