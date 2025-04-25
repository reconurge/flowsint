from pydantic import BaseModel
from typing import List, Optional
from .whois import Whois
from .ip import Ip

class MinimalDomain(BaseModel):
    domain: str

class Domain(MinimalDomain):
    whois: Optional[Whois] = None
    subdomains: Optional[List["Domain"]] = []
    ips: Optional[List[Ip]] = []

Domain.model_rebuild()

