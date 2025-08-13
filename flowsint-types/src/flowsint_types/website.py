from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl
from .domain import Domain


class Website(BaseModel):
    """Represents a website with its URL, domain, and redirect information."""

    url: HttpUrl = Field(
        ..., description="Full URL of the website", title="Website URL"
    )
    redirects: Optional[List[HttpUrl]] = Field(
        [], description="List of redirects from the website", title="Redirects"
    )
    domain: Optional[Domain] = Field(
        None, description="Domain information for the website", title="Domain"
    )
    active: Optional[bool] = Field(
        False, description="Whether the website is active", title="Is Active"
    )
