from pydantic import Field, model_validator
from typing import Optional, List, Self

from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class Session(FlowsintType):
    """Represents a user session with device and activity information."""

    session_id: str = Field(
        ..., description="Unique session identifier", title="Session ID", json_schema_extra={"primary": True}
    )
    user_id: Optional[str] = Field(None, description="User identifier", title="User ID")
    service: Optional[str] = Field(
        None, description="Service or platform", title="Service"
    )
    start_time: Optional[str] = Field(
        None, description="Session start timestamp", title="Start Time"
    )
    end_time: Optional[str] = Field(
        None, description="Session end timestamp", title="End Time"
    )
    duration: Optional[int] = Field(
        None, description="Session duration in seconds", title="Duration"
    )
    ip_address: Optional[str] = Field(
        None, description="IP address used for session", title="IP Address"
    )
    user_agent: Optional[str] = Field(
        None, description="User agent string", title="User Agent"
    )
    location: Optional[str] = Field(
        None, description="Geographic location", title="Location"
    )
    device_type: Optional[str] = Field(
        None, description="Type of device used", title="Device Type"
    )
    browser: Optional[str] = Field(None, description="Browser used", title="Browser")
    os: Optional[str] = Field(
        None, description="Operating system", title="Operating System"
    )
    is_active: Optional[bool] = Field(
        None, description="Whether session is currently active", title="Is Active"
    )
    is_suspicious: Optional[bool] = Field(
        None, description="Whether session is suspicious", title="Is Suspicious"
    )
    activities: Optional[List[str]] = Field(
        None, description="Activities performed during session", title="Activities"
    )
    source: Optional[str] = Field(
        None, description="Source of session information", title="Source"
    )

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        parts = []
        if self.user_id:
            parts.append(self.user_id)
        if self.service:
            parts.append(self.service)
        if not parts:
            parts.append(self.session_id)
        self.nodeLabel = " - ".join(parts)
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse a session from a raw string."""
        return cls(session_id=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        """Session cannot be reliably detected from a single line of text."""
        return False
