from pydantic import BaseModel, Field
from typing import Any


class Phrase(BaseModel):
    """Represents a phrase or text content."""

    text: Any = Field(
        ..., description="The content of the phrase.", title="Phrase text value."
    )
