from pydantic import BaseModel, Field
from typing import Optional

class Individual(BaseModel):
    first_name: str = Field(..., description="First name of the individual")
    last_name: str = Field(..., description="Last name of the individual")
    full_name: str = Field(..., description="Full name of the individual")
    birth_date: Optional[str] = Field(None, description="Date of birth")
    gender: Optional[str] = Field(None, description="Gender of the individual")