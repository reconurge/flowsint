from pydantic import BaseModel, Field
from typing import Optional


class Username(BaseModel):
    """Represents a username or handle on any platform."""

    value: str = Field(..., description="Username or handle string", title="Username value")
    platform: Optional[str] = Field(None, description="Platform name, e.g., 'twitter'", title="Username platform")
    last_seen: Optional[str] = Field(
        None, description="Last time this username was observed", title="Last seen at"
    )
