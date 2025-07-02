from typing import Optional
from pydantic import BaseModel, Field

class Domain(BaseModel):
    domain: str = Field(..., description="Domain name")
    root: Optional[bool]= Field(True, description="Is root or not")
    
Domain.model_rebuild()

