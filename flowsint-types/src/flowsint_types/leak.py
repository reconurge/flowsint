from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class Leak(BaseModel):
    """Represents a data leak or breach with associated data."""

    name: str = Field(
        ..., description="The name of the leak or service brea", title="Leak Name"
    )
    leak: Optional[List[Dict]] = Field(
        None, description="List of data leaks found", title="Leak Data"
    )
