from typing import Optional, Union, Self
from pydantic import Field, field_validator, model_validator
from .email import Email
from .domain import Domain
from .organization import Organization
from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class Whois(FlowsintType):
    """Represents WHOIS domain registration information."""

    domain: Domain = Field(..., description="Domain information", title="Domain", json_schema_extra={"primary": True})
    registry_domain_id: Optional[str] = Field(
        None, description="Registry Domain ID (unique identifier)", title="Registry Domain ID"
    )
    registrar: Optional[str] = Field(
        None, description="Domain registrar name", title="Registrar"
    )
    organization: Optional[Organization] = Field(
        None,
        description="Organization associated with the domain",
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

    @field_validator('organization', mode='before')
    @classmethod
    def convert_organization(cls, v: Union[str, dict, Organization, None]) -> Optional[Organization]:
        """Convert string or dict to Organization object if needed."""
        if v is None:
            return None
        if isinstance(v, Organization):
            return v
        elif isinstance(v, str):
            return Organization(name=v)
        elif isinstance(v, dict):
            return Organization(**v)
        return v

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        # Use domain and organization if available
        if self.organization:
            self.nodeLabel = f"{self.domain.domain} - {self.organization.name}"
        else:
            self.nodeLabel = self.domain.domain
        return self

    @classmethod
    def detect(cls, line: str) -> bool:
        """Whois cannot be reliably detected from a single line of text."""
        return False
