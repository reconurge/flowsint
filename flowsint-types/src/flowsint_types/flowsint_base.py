from pydantic import BaseModel, Field
from typing import Optional


class FlowsintType(BaseModel):
    """Base class for all Flowsint entity types with label support.
    Label is optional but computed at definition time.

    All classes that inherit from FlowsintType must be decorated with @flowsint_type
    to be registered in the global TYPE_REGISTRY and accessed by their class name.

    Usage:
        from flowsint_types.registry import flowsint_type

        @flowsint_type
        class Domain(FlowsintType):
            domain: str
    """
    label: Optional[str] = Field(
        None, description="UI-readable label for this entity, the one used on the graph.", title="Label"
    )
