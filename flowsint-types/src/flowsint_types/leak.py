from typing import List, Dict, Optional, Self
from pydantic import Field, model_validator

from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class Leak(FlowsintType):
    """Represents a data leak or breach with associated data."""

    name: str = Field(
        ..., description="The name of the leak or service brea", title="Leak Name", json_schema_extra={"primary": True}
    )
    leak: Optional[List[Dict]] = Field(
        None, description="List of data leaks found", title="Leak Data"
    )

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        self.label = self.name
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse a leak from a raw string."""
        return cls(name=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        """Leak cannot be reliably detected from a single line of text."""
        return False
