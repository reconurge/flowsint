from pydantic import BaseModel, Field
from typing import Optional


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
