from pydantic import BaseModel
from typing import Optional, List

class Identifier(BaseModel):
    type: str  # Example: "SIREN", "SIRET", "DUNS", "VAT", "LEI", etc.
    value: str
    country: Optional[str] = None
    issued_by: Optional[str] = None
    
class Organization(BaseModel):
    name: str
    founding_date: Optional[str] = None
    country: Optional[str] = None
    description: Optional[str] = None
    identifiers: Optional[List[Identifier]] = None