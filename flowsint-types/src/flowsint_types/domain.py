from typing import Optional, Self
from pydantic import Field, field_validator, model_validator
from urllib.parse import urlparse
import re
from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class Domain(FlowsintType):
    """Represents a domain name and its properties."""

    domain: str = Field(
        ...,
        description="Domain name",
        title="Domain name",
        json_schema_extra={"primary": True},
    )
    root: Optional[bool] = Field(
        True, description="Is root or not", title="Is Root Domain"
    )

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, v: str) -> str:
        try:
            parsed = urlparse(v if "://" in v else "http://" + v)
            hostname = parsed.hostname or v
            if not hostname or "." not in hostname:
                raise ValueError
            if not re.match(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", hostname):
                raise ValueError
            return hostname
        except Exception:
            raise ValueError(f"Invalid domain: {v}")

    @model_validator(mode="after")
    def check_root(self) -> Self:
        parts = self.domain.split(".")
        self.root = len(parts) == 2
        return self

    @model_validator(mode="after")
    def compute_label(self) -> Self:
        self.label = self.domain
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse a domain from a raw string."""
        return cls(domain=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        """Detect if a line of text contains a domain."""
        line = line.strip()
        if not line or len(line) > 253:  # Max domain length
            return False

        # Basic domain pattern: alphanumeric + hyphens, dots, and must have TLD
        domain_pattern = r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
        if not re.match(domain_pattern, line):
            return False

        # Additional validation: not too many consecutive dots, no leading/trailing dots
        if '..' in line or line.startswith('.') or line.endswith('.'):
            return False

        return True
