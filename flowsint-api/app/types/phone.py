from pydantic import BaseModel
from typing import Optional

class Phone(BaseModel):
    number: str
    country: Optional[str] = None
    carrier: Optional[str] = None