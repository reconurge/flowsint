from pydantic import BaseModel
from typing import List, Optional
from .ip import Ip

class MinimalDomain(BaseModel):
    domain: str

class Domain(MinimalDomain):
    subdomains: Optional[List["Domain"]] = []
    ips: Optional[List[Ip]] = []

Domain.model_rebuild()

