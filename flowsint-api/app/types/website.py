from typing import Optional
from pydantic import BaseModel, Field, HttpUrl
from app.types.domain import Domain

class Website(BaseModel):
    url: HttpUrl = Field(..., description="Full URL of the website")
    domain: Domain = Field(..., description="Domain information for the website")