from pydantic import Field, model_validator
from typing import Optional, Self
from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class Location(FlowsintType):
    """Represents a physical address with geographical coordinates."""

    address: str = Field(..., description="Street address", title="Street Address", json_schema_extra={"primary": True})
    city: str = Field(..., description="City name", title="City")
    country: str = Field(..., description="Country name", title="Country")
    zip: str = Field(..., description="ZIP or postal code", title="ZIP/Postal Code")
    latitude: Optional[float] = Field(
        None, description="Latitude coordinate of the address", title="Latitude"
    )
    longitude: Optional[float] = Field(
        None, description="Longitude coordinate of the address", title="Longitude"
    )

    @model_validator(mode="after")
    def compute_label(self) -> Self:
        self.label = f"{self.address}, {self.city}, {self.country}"
        return self

    @classmethod
    def detect(cls, line: str) -> bool:
        """Location cannot be reliably detected from a single line of text."""
        return False
