from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Any
import re


class Username(BaseModel):
    """Represents a username or handle on any platform."""

    value: str = Field(..., description="Username or handle string", title="Username value")
    platform: Optional[str] = Field(None, description="Platform name, e.g., 'twitter'", title="Username platform")
    last_seen: Optional[str] = Field(
        None, description="Last time this username was observed", title="Last seen at"
    )

    @model_validator(mode='before')
    @classmethod
    def convert_string_to_dict(cls, data: Any) -> Any:
        """Allow creating Username from a string directly."""
        if isinstance(data, str):
            return {'value': data}
        return data

    @field_validator('value')
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate username format.

        Username must be 3-30 characters long and contain only:
        - Letters (a-z, A-Z)
        - Numbers (0-9)
        - Underscores (_)
        - Hyphens (-)
        """
        if not re.match(r"^[a-zA-Z0-9_-]{3,30}$", v):
            raise ValueError(
                f"Invalid username: {v}. Must be 3-30 characters and contain only letters, numbers, underscores, and hyphens."
            )
        return v
