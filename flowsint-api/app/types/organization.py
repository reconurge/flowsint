from pydantic import BaseModel, Field
from typing import Optional, List

class Identifier(BaseModel):
    type: str = Field(..., description="Type of identifier (e.g., SIREN, SIRET, DUNS, VAT, LEI)")
    value: str = Field(..., description="The identifier value")
    country: Optional[str] = Field(None, description="Country where the identifier was issued")
    issued_by: Optional[str] = Field(None, description="Authority that issued the identifier")
    
    
class Organization(BaseModel):
    name: str = Field(..., description="Organization name")
    founding_date: Optional[str] = Field(None, description="Date when the organization was founded")
    country: Optional[str] = Field(None, description="Country where the organization is based")
    description: Optional[str] = Field(None, description="Description of the organization's activities")
    identifiers: Optional[List[Identifier]] = Field(None, description="List of official identifiers for the organization")