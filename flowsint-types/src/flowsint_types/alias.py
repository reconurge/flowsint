from pydantic import BaseModel, Field
from typing import Optional, List


class Alias(BaseModel):
    """Represents an alias or alternative name used by an entity."""

    alias: str = Field(..., description="Alias or alternative name", title="Alias")
    type: Optional[str] = Field(
        None,
        description="Type of alias (nickname, code name, etc.)",
        title="Alias Type",
    )
    context: Optional[str] = Field(
        None, description="Context where alias is used", title="Context"
    )
    first_seen: Optional[str] = Field(
        None, description="First time alias was observed", title="First Seen"
    )
    last_seen: Optional[str] = Field(
        None, description="Last time alias was observed", title="Last Seen"
    )
    confidence: Optional[float] = Field(
        None, description="Confidence score for alias association", title="Confidence"
    )
    source: Optional[str] = Field(
        None, description="Source of alias information", title="Source"
    )
    associated_entities: Optional[List[str]] = Field(
        None,
        description="Entities associated with this alias",
        title="Associated Entities",
    )
    description: Optional[str] = Field(
        None, description="Description or notes about the alias", title="Description"
    )
    is_active: Optional[bool] = Field(
        None, description="Whether alias is currently active", title="Is Active"
    )
    language: Optional[str] = Field(
        None, description="Language of the alias", title="Language"
    )
    region: Optional[str] = Field(
        None, description="Geographic region where alias is used", title="Region"
    )
