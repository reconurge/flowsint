from typing import Optional
from pydantic import BaseModel
from app.types.email import Email
from app.types.domain import Domain

class Whois(BaseModel):
    domain:Domain
    registrar: Optional[str] = None 
    org: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    email: Optional[Email] = None
    creation_date: Optional[str] = None
    expiration_date: Optional[str] = None
