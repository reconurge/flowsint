from pydantic import BaseModel, Field
from typing import Optional, Literal

class Individual(BaseModel):
    first_name: str = Field(..., description="First name of the individual", title="First Name")
    last_name: str = Field(..., description="Last name of the individual", title="Last Name")
    full_name: str = Field(..., description="Full name of the individual", title="Full Name")
    birth_date: Optional[str] = Field(None, description="Date of birth", title="Date of Birth")
    gender: Optional[Literal["male", "female", "other"]] = Field(None, description="Gender of the individual", title="Gender")