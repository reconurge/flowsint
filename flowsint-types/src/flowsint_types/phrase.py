from pydantic import Field, model_validator
from typing import Any, Self

from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class Phrase(FlowsintType):
    """Represents a phrase or text content."""

    text: Any = Field(
        ..., description="The content of the phrase.", title="Phrase text value.", json_schema_extra={"primary": True}
    )

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        text_str = str(self.text)
        # Truncate to 100 characters for display
        self.nodeLabel = text_str[:100] + "..." if len(text_str) > 100 else text_str
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse a phrase from a raw string."""
        return cls(text=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        """Phrase is a fallback type and should not be auto-detected to avoid false positives."""
        return False
