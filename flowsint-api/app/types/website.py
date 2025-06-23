from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl
from app.types.domain import Domain

class Website(BaseModel):
    url: HttpUrl = Field(..., description="Full URL of the website")
    redirects: Optional[List[HttpUrl]] = Field([], description="List of redirects from the website")
    domain: Optional[Domain] = Field(None, description="Domain information for the website")
    active: Optional[bool] = Field(False, description="Whether the website is active")