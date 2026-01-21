from typing import Dict, List, Optional, Self
from pydantic import Field, HttpUrl, model_validator
import re
from .domain import Domain
from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class Website(FlowsintType):
    """Represents a website with its URL, domain, and redirect information."""

    url: HttpUrl = Field(
        ...,
        description="Full URL of the website",
        title="Website URL",
        json_schema_extra={"primary": True},
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
    title: Optional[str] = Field(
        None, description="Page title from <title> tag", title="Title"
    )
    description: Optional[str] = Field(
        None, description="Meta description of the page", title="Description"
    )
    content: Optional[str] = Field(
        None, description="Text content of the page", title="Content"
    )
    status_code: Optional[int] = Field(
        None, description="HTTP status code", title="Status Code", ge=100, le=599 # Enforce status code
    )
    headers: Optional[Dict[str, str]] = Field(
        None, description="Relevant HTTP headers", title="Headers"
    )
    technologies: Optional[List[str]] = Field(
        [], description="Detected web technologies", title="Technologies"
    )

    @model_validator(mode="after")
    def compute_label(self) -> Self:
        self.nodeLabel = str(self.url)
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
        url_pattern = r"^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$"
        return bool(re.match(url_pattern, line))
