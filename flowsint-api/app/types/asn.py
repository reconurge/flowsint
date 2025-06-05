from typing import List, Optional
from pydantic import BaseModel, Field
from .cidr import CIDR

class ASN(BaseModel):
    number: int = Field(..., description="Autonomous System Number (e.g., 15169)")
    name: Optional[str] = Field(None, description="Name of the organization owning the ASN")
    country: Optional[str] = Field(None, description="ISO 3166-1 alpha-2 country code")
    description: Optional[str] = Field(None, description="Additional information about the ASN")
    cidrs: List[CIDR] = Field(default_factory=list, description="List of announced CIDR blocks")

ASN.model_rebuild()
