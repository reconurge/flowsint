from typing import List, Optional
from pydantic import BaseModel, Field
from .cidr import CIDR


class ASN(BaseModel):
    """Represents an Autonomous System Number with associated network information."""

    number: int = Field(
        ..., description="Autonomous System Number (e.g., 15169)", title="ASN Number"
    )
    name: Optional[str] = Field(
        None,
        description="Name of the organization owning the ASN",
        title="Organization Name",
    )
    country: Optional[str] = Field(
        None, description="ISO 3166-1 alpha-2 country code", title="Country Code"
    )
    description: Optional[str] = Field(
        None, description="Additional information about the ASN", title="Description"
    )
    cidrs: List[CIDR] = Field(
        default_factory=list,
        description="List of announced CIDR blocks",
        title="CIDR Blocks",
    )


ASN.model_rebuild()
