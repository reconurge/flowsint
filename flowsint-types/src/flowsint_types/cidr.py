from pydantic import BaseModel, IPvAnyNetwork, Field


class CIDR(BaseModel):
    """Represents a CIDR (Classless Inter-Domain Routing) network block."""

    network: IPvAnyNetwork = Field(
        ..., description="CIDR block (e.g., 8.8.8.0/24)", title="Network Block"
    )
