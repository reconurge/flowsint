from typing import List, Optional, Self
from pydantic import Field, HttpUrl, model_validator
import re
from .domain import Domain
from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
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

    @classmethod
    def from_string(cls, line: str):
        """Parse a website from a raw string."""
        return cls(url=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        """Detect if a line of text contains a website URL."""
        line = line.strip()
        if not line:
            return False

        # URL pattern: must start with http:// or https://
        url_pattern = r'^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$'
        return bool(re.match(url_pattern, line))
