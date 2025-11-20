from pydantic import BaseModel, Field
from typing import Optional


class FlowsintType(BaseModel):
    """Base class for all Flowsint entity types with label support.
    Label is optional but computed at definition time.
    """
    label: Optional[str] = Field(
        None, description="UI-readable label for this entity, the one used on the graph.", title="Label"
    )
