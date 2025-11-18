from pydantic import BaseModel, Field
from typing import Optional


class Port(BaseModel):
    """Represents an open network port related to an IP address."""

    number: int = Field(..., description="Port number", title="Port Number")
    protocol: Optional[str] = Field(
        None, description="Protocol (TCP, UDP, etc.)", title="Protocol"
    )
    state: Optional[str] = Field(
        None, description="Port state (open, closed, filtered, etc.)", title="State"
    )
    service: Optional[str] = Field(
        None, description="Service running on the port", title="Service"
    )
    banner: Optional[str] = Field(
        None, description="Service banner information", title="Banner"
    )
