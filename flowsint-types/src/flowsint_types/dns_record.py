from pydantic import Field, model_validator
from typing import Optional, List, Self

from .flowsint_base import FlowsintType


class DNSRecord(FlowsintType):
    """Represents a DNS record with type, value, and security information."""

    value: str = Field(
        ...,
        description="Record value",
        title="Record Value",
        json_schema_extra={"primary": True},
    )
    record_type: str = Field(
        ...,
        description="Type of DNS record (A, AAAA, CNAME, MX, etc.)",
        title="Record Type",
    )
    ttl: Optional[int] = Field(None, description="Time to live in seconds", title="TTL")
    priority: Optional[int] = Field(
        None, description="Priority for MX records", title="Priority"
    )
    first_seen: Optional[str] = Field(
        None, description="First time record was observed", title="First Seen"
    )
    last_seen: Optional[str] = Field(
        None, description="Last time record was observed", title="Last Seen"
    )
    is_active: Optional[bool] = Field(
        None, description="Whether record is currently active", title="Is Active"
    )
    nameserver: Optional[str] = Field(
        None, description="Nameserver that provided the record", title="Nameserver"
    )
    source: Optional[str] = Field(
        None, description="Source of DNS information", title="Source"
    )
    associated_domains: Optional[List[str]] = Field(
        None, description="Related domain names", title="Associated Domains"
    )
    description: Optional[str] = Field(
        None, description="Additional notes about the record", title="Description"
    )
    is_suspicious: Optional[bool] = Field(
        None, description="Whether record is suspicious", title="Is Suspicious"
    )
    malware_family: Optional[str] = Field(
        None,
        description="Malware family if record is malicious",
        title="Malware Family",
    )
    threat_level: Optional[str] = Field(
        None, description="Threat level assessment", title="Threat Level"
    )

    @model_validator(mode="after")
    def compute_label(self) -> Self:
        self.label = self.value
        return self
