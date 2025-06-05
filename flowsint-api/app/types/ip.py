from pydantic import BaseModel, Field
from typing import Optional

class MinimalIp(BaseModel):
    address: str = Field(..., description="IP address")

class Ip(MinimalIp):
    latitude: Optional[float] = Field(None, description="Latitude coordinate of the IP location")
    longitude: Optional[float] = Field(None, description="Longitude coordinate of the IP location")
    country: Optional[str] = Field(None, description="Country where the IP is located")
    city: Optional[str] = Field(None, description="City where the IP is located")
    isp: Optional[str] = Field(None, description="Internet Service Provider")
