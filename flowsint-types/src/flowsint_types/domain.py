from typing import Optional
from pydantic import BaseModel, Field


class Domain(BaseModel):
    """Represents a domain name and its properties."""

    domain: str = Field(..., description="Domain name", title="Domain Name")
    root: Optional[bool] = Field(
        True, description="Is root or not", title="Is Root Domain"
    )


Domain.model_rebuild()
