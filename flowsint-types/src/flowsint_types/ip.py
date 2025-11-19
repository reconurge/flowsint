from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Any
import ipaddress


class Ip(BaseModel):
    """Represents an IP address with geolocation and ISP information."""

    address: str = Field(..., description="IP address", title="IP Address")
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

    @model_validator(mode='before')
    @classmethod
    def convert_string_to_dict(cls, data: Any) -> Any:
        """Allow creating Ip from a string directly."""
        if isinstance(data, str):
            return {'address': data}
        return data

    @field_validator('address')
    @classmethod
    def validate_ip_address(cls, v: str) -> str:
        """Validate that the address is a valid IP address."""
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid IP address: {v}")
