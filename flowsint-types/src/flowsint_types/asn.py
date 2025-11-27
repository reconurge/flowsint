from typing import List, Optional, Union, Self
from pydantic import Field, field_validator, model_validator
import re
from .flowsint_base import FlowsintType


class ASN(FlowsintType):
    """Represents an Autonomous System Number with associated network information."""

    number: int = Field(
        ..., description="Autonomous System Number (e.g., 15169)", title="ASN Number"
    )
    asn_str: Optional[str] = Field(
        None, description="ASN in string format (e.g., 'AS15169')", title="ASN String", json_schema_extra={"primary": True}
    )
    name: Optional[str] = Field(
        None,
        description="Name of the organization owning the ASN",
        title="Organization Name",
    )
    country: Optional[str] = Field(
        None, description="ISO 3166-1 alpha-2 country code", title="Country Code"
    )
    description: Optional[str] = Field(
        None, description="Additional information about the ASN", title="Description"
    )
    cidrs: List['CIDR'] = Field(
        default_factory=list,
        description="List of announced CIDR blocks",
        title="CIDR Blocks",
    )

    @field_validator('number', mode='before')
    @classmethod
    def validate_asn_number(cls, v: Union[int, str]) -> int:
        """Validate and normalize ASN number.

        Accepts:
        - Integer: 15169
        - String with AS prefix: "AS15169"
        - String without prefix: "15169"

        Returns the integer ASN number.
        """
        if isinstance(v, str):
            # Remove 'AS' prefix if present (case insensitive)
            v = re.sub(r"(?i)^AS", "", v.strip())
            try:
                v = int(v)
            except ValueError:
                raise ValueError(f"Invalid ASN format: {v}")

        if not isinstance(v, int):
            raise ValueError(f"ASN must be an integer or string, got {type(v)}")

        # Validate ASN range (32-bit unsigned integer)
        if not (0 <= v <= 4294967295):
            raise ValueError(f"ASN number must be between 0 and 4294967295, got {v}")

        return v

    @model_validator(mode='after')
    def populate_asn_str(self) -> Self:
        """Automatically populate asn_str from number if not provided."""
        # Always set asn_str based on number to ensure consistency
        self.asn_str = f"AS{self.number}"
        return self

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        # Use name and ASN string if available
        if self.name:
            self.label = f"{self.asn_str} - {self.name}"
        else:
            self.label = self.asn_str
        return self


# Import CIDR here to avoid circular import
from .cidr import CIDR

ASN.model_rebuild()
