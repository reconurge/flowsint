from typing import Optional
from pydantic import BaseModel, Field
from .email import Email


class Whois(BaseModel):
    """Represents WHOIS domain registration information."""

    domain: str = Field(..., description="Domain name", title="Domain")
    registrar: Optional[str] = Field(
        None, description="Domain registrar name", title="Registrar"
    )
    org: Optional[str] = Field(
        None,
        description="Organization name associated with the domain",
        title="Organization",
    )
    city: Optional[str] = Field(
        None, description="City where the domain is registered", title="City"
    )
    country: Optional[str] = Field(
        None, description="Country where the domain is registered", title="Country"
    )
    email: Optional[Email] = Field(
        None, description="Contact email for the domain", title="Contact Email"
    )
    creation_date: Optional[str] = Field(
        None, description="Date when the domain was created", title="Creation Date"
    )
    expiration_date: Optional[str] = Field(
        None, description="Date when the domain expires", title="Expiration Date"
    )
