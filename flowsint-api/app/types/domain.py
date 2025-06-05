from pydantic import BaseModel, Field
from typing import List, Optional
from .ip import Ip

class MinimalDomain(BaseModel):
    domain: str = Field(..., description="Domain name")

class Domain(MinimalDomain):
    subdomains: Optional[List["Domain"]] = Field(default=[], description="List of subdomains associated with this domain")
    ips: Optional[List[Ip]] = Field(default=[], description="List of IP addresses associated with this domain")

Domain.model_rebuild()

