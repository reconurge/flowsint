from pydantic import BaseModel, IPvAnyNetwork, Field

class CIDR(BaseModel):
    network: IPvAnyNetwork = Field(..., description="CIDR block (e.g., 8.8.8.0/24)", title="Network Block")
