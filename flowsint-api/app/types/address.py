
from pydantic import BaseModel
from typing import Optional

class Address(BaseModel):
    address: str
    city: str
    country: str
    zip: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

