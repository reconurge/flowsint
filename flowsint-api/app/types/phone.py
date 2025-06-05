from pydantic import BaseModel, Field
from typing import Optional

class Phone(BaseModel):
    number: str = Field(..., description="Phone number")
    country: Optional[str] = Field(None, description="Country code (ISO 3166-1 alpha-2)")
    carrier: Optional[str] = Field(None, description="Mobile carrier or service provider")