from pydantic import Field, field_validator, model_validator
from typing import Optional, Any, Self
import re
from .flowsint_base import FlowsintType


class Username(FlowsintType):
    """Represents a username or handle on any platform."""

    value: str = Field(..., description="Username or handle string", title="Username value")
    platform: Optional[str] = Field(None, description="Platform name, e.g., 'twitter'", title="Username platform")
    last_seen: Optional[str] = Field(
        None, description="Last time this username was observed", title="Last seen at"
    )

    @field_validator('value')
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate username format.

        Username must be 3-80 characters long and contain only:
        - Letters (a-z, A-Z)
        - Numbers (0-9)
        - Underscores (_)
        - Hyphens (-)
        """
        if not re.match(r"^[a-zA-Z0-9_-]{3,80}$", v):
            raise ValueError(
                f"Invalid username: {v}. Must be 3-80 characters and contain only letters, numbers, underscores, and hyphens."
            )
        return v

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        if self.platform:
            self.label = f"@{self.value} ({self.platform})"
        else:
            self.label = f"@{self.value}"
        return self
