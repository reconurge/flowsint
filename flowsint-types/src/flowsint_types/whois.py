from typing import Optional, Union
from pydantic import BaseModel, Field, field_validator
from .email import Email
from .domain import Domain


class Whois(BaseModel):
    """Represents WHOIS domain registration information."""

    domain: Domain = Field(..., description="Domain information", title="Domain")
    registry_domain_id: Optional[str] = Field(
        None, description="Registry Domain ID (unique identifier)", title="Registry Domain ID"
    )
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

    @field_validator('domain', mode='before')
    @classmethod
    def convert_domain(cls, v: Union[str, dict, Domain]) -> Domain:
        """Convert string or dict to Domain object if needed."""
        if isinstance(v, Domain):
            return v
        elif isinstance(v, str):
            return Domain(domain=v)
        elif isinstance(v, dict):
            return Domain(**v)
        return v
