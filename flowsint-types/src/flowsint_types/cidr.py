from pydantic import IPvAnyNetwork, Field, model_validator
from typing import Self
from .flowsint_base import FlowsintType


class CIDR(FlowsintType):
    """Represents a CIDR (Classless Inter-Domain Routing) network block."""

    network: IPvAnyNetwork = Field(
        ..., description="CIDR block (e.g., 8.8.8.0/24)", title="Network Block"
    )

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        self.label = str(self.network)
        return self
