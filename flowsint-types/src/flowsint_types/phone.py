from pydantic import BaseModel, Field
from typing import Optional


class Phone(BaseModel):
    """Represents a phone number with country and carrier information."""

    number: str = Field(..., description="Phone number", title="Phone Number")
    country: Optional[str] = Field(
        None, description="Country code (ISO 3166-1 alpha-2)", title="Country Code"
    )
    carrier: Optional[str] = Field(
        None, description="Mobile carrier or service provider", title="Carrier"
    )
