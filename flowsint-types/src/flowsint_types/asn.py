from typing import List, Optional, Union, Self
from pydantic import Field, field_validator, model_validator
import re
from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class ASN(FlowsintType):
    """Represents an Autonomous System Number with associated network information."""

    asn_str: str = Field(
        ...,
        description="ASN in string format (e.g., 'AS15169')",
        title="ASN String",
        json_schema_extra={"primary": True},
    )
    number: Optional[int] = Field(
        None, description="Autonomous System Number (e.g., 15169)", title="ASN Number"
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
    cidrs: List["CIDR"] = Field(
        default_factory=list,
        description="List of announced CIDR blocks",
        title="CIDR Blocks",
    )

    @field_validator("asn_str")
    @classmethod
    def validate_asn_str(cls, v: str) -> str:
        """Validate and normalize ASN string.

        Accepts:
        - String with AS prefix: "AS15169"
        - String without prefix: "15169"

        Returns the string in "AS{number}" format.
        """
        v = v.strip()

        # Remove 'AS' prefix if present (case insensitive)
        number_str = re.sub(r"(?i)^AS", "", v)

        try:
            number = int(number_str)
        except ValueError:
            raise ValueError(f"Invalid ASN format: {v}")

        # Validate ASN range (32-bit unsigned integer)
        if not (0 <= number <= 4294967295):
            raise ValueError(
                f"ASN number must be between 0 and 4294967295, got {number}"
            )

        return f"AS{number}"

    @model_validator(mode="after")
    def populate_number(self) -> Self:
        """Automatically populate number from asn_str if not provided."""
        # Extract number from asn_str
        if self.number is None:
            number_str = re.sub(r"(?i)^AS", "", self.asn_str)
            self.number = int(number_str)
        return self

    @model_validator(mode="after")
    def compute_label(self) -> Self:
        # Use name and ASN string if available
        if self.name:
            self.label = f"{self.asn_str} - {self.name}"
        else:
            self.label = self.asn_str
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse an ASN from a raw string."""
        return cls(asn_str=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        line = line.strip()
        if not line:
            return False
        m = re.match(r"(?i)^AS(\d+)$", line)
        if m:
            num = int(m.group(1))
            return 1 <= num <= 4294967295  # ASN range
        return False


# Import CIDR here to avoid circular import
from .cidr import CIDR

ASN.model_rebuild()
