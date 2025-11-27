from typing import List, Optional, Self
from pydantic import Field, HttpUrl, model_validator
from .domain import Domain
from .flowsint_base import FlowsintType


class Website(FlowsintType):
    """Represents a website with its URL, domain, and redirect information."""

    url: HttpUrl = Field(
        ..., description="Full URL of the website", title="Website URL", json_schema_extra={"primary": True}
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

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        self.label = str(self.url)
        return self
