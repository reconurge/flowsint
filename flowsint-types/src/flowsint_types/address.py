from pydantic import BaseModel, Field
from typing import Optional


class Location(BaseModel):
    """Represents a physical address with geographical coordinates."""

    address: str = Field(..., description="Street address", title="Street Address")
    city: str = Field(..., description="City name", title="City")
    country: str = Field(..., description="Country name", title="Country")
    zip: str = Field(..., description="ZIP or postal code", title="ZIP/Postal Code")
    latitude: Optional[float] = Field(
        None, description="Latitude coordinate of the address", title="Latitude"
    )
    longitude: Optional[float] = Field(
        None, description="Longitude coordinate of the address", title="Longitude"
    )
