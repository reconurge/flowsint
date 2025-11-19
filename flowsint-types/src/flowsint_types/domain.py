from typing import Optional, Union, Any
from pydantic import BaseModel, Field, field_validator, model_validator
from urllib.parse import urlparse
import re


class Domain(BaseModel):
    """Represents a domain name and its properties."""

    domain: str = Field(..., description="Domain name", title="Domain Name")
    root: Optional[bool] = Field(
        True, description="Is root or not", title="Is Root Domain"
    )

    @model_validator(mode='before')
    @classmethod
    def convert_string_to_dict(cls, data: Any) -> Any:
        """Allow creating Domain from a string directly."""
        if isinstance(data, str):
            return {'domain': data}
        return data

    @field_validator('domain')
    @classmethod
    def validate_domain(cls, v: str) -> str:
        """Validate that the domain is valid."""
        try:
            # Parse URL to extract hostname
            parsed = urlparse(v if "://" in v else "http://" + v)
            hostname = parsed.hostname or v

            # Check that domain has at least one dot
            if not hostname or "." not in hostname:
                raise ValueError(f"Invalid domain format: {v}")

            # Validate domain format with regex
            if not re.match(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", hostname):
                raise ValueError(f"Invalid domain format: {v}")

            # Return the cleaned hostname (without protocol)
            return hostname
        except Exception as e:
            raise ValueError(f"Invalid domain: {v}") from e


Domain.model_rebuild()
