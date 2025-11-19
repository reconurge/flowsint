from pydantic import Field, field_validator, model_validator
from typing import Optional, Any, Self
import ipaddress
from .flowsint_base import FlowsintType


class Ip(FlowsintType):
    """Represents an IP address with geolocation and ISP information."""

    address: str = Field(
        ...,
        description="IP address",
        title="IP Address",
        json_schema_extra={"primary": True},
    )
    latitude: Optional[float] = Field(
        None, description="Latitude coordinate of the IP location", title="Latitude"
    )
    longitude: Optional[float] = Field(
        None, description="Longitude coordinate of the IP location", title="Longitude"
    )
    country: Optional[str] = Field(
        None, description="Country where the IP is located", title="Country"
    )
    city: Optional[str] = Field(
        None, description="City where the IP is located", title="City"
    )
    isp: Optional[str] = Field(
        None, description="Internet Service Provider", title="ISP"
    )

    @field_validator("address")
    @classmethod
    def validate_ip_address(cls, v: str) -> str:
        """Validate that the address is a valid IP address."""
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid IP address: {v}")

    @model_validator(mode="after")
    def compute_label(self) -> Self:
        self.label = self.address
        return self
