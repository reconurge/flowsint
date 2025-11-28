from pydantic import IPvAnyNetwork, Field, model_validator
from typing import Self
import ipaddress
from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class CIDR(FlowsintType):
    """Represents a CIDR (Classless Inter-Domain Routing) network block."""

    network: IPvAnyNetwork = Field(
        ..., description="CIDR block (e.g., 8.8.8.0/24)", title="Network Block", json_schema_extra={"primary": True}
    )

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        self.label = str(self.network)
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse a CIDR from a raw string."""
        return cls(network=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        """Detect if a line of text contains a CIDR block."""
        line = line.strip()
        if not line or '/' not in line:
            return False

        try:
            ipaddress.ip_network(line, strict=False)
            return True
        except ValueError:
            return False
