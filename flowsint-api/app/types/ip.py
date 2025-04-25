from pydantic import BaseModel
from typing import Optional

class MinimalIp(BaseModel):
    address: str

class Ip(MinimalIp):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    country: Optional[str] = None
    city: Optional[str] = None
    isp: Optional[str] = None
