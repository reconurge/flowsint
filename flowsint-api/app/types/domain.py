from pydantic import BaseModel, Field
from typing import List, Optional
from app.types.whois import Whois
from .ip import Ip

class Domain(BaseModel):
    domain: str = Field(..., description="Domain name")
    subdomains: Optional[List["Domain"]] = Field(default=[], description="List of subdomains associated with this domain")
    ips: Optional[List[Ip]] = Field(default=[], description="List of IP addresses associated with this domain")
    whois: Optional[Whois] = Field(default=None, description="Whois information for this domain")

Domain.model_rebuild()

