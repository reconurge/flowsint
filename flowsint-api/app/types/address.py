from pydantic import BaseModel, Field
from typing import Optional

class Address(BaseModel):
    address: str = Field(..., description="Street address")
    city: str = Field(..., description="City name")
    country: str = Field(..., description="Country name")
    zip: str = Field(..., description="ZIP or postal code")
    latitude: Optional[float] = Field(None, description="Latitude coordinate of the address")
    longitude: Optional[float] = Field(None, description="Longitude coordinate of the address")

