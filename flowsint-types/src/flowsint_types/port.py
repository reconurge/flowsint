from pydantic import Field, field_validator, model_validator
from typing import Optional, Self
from .flowsint_base import FlowsintType


class Port(FlowsintType):
    """Represents an open network port related to an IP address."""

    number: int = Field(..., description="Port number", title="Port Number", json_schema_extra={"primary": True})
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

    @field_validator('number')
    @classmethod
    def validate_port_number(cls, v: int) -> int:
        """Validate that port number is in valid range (0-65535)."""
        if not (0 <= v <= 65535):
            raise ValueError(f"Port number must be between 0 and 65535, got {v}")
        return v

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        # Include service and protocol if available
        parts = [str(self.number)]
        if self.service:
            parts.append(self.service)
        if self.protocol:
            parts.append(f"({self.protocol})")
        self.label = " ".join(parts)
        return self
