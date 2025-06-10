from typing import Optional
from pydantic import BaseModel, Field
from app.types.email import Email

class Whois(BaseModel):
    registrar: Optional[str] = Field(None, description="Domain registrar name")
    org: Optional[str] = Field(None, description="Organization name associated with the domain")
    city: Optional[str] = Field(None, description="City where the domain is registered")
    country: Optional[str] = Field(None, description="Country where the domain is registered")
    email: Optional[Email] = Field(None, description="Contact email for the domain")
    creation_date: Optional[str] = Field(None, description="Date when the domain was created")
    expiration_date: Optional[str] = Field(None, description="Date when the domain expires")
