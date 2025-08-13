from pydantic import BaseModel, Field
from typing import Optional, List


class Session(BaseModel):
    """Represents a user session with device and activity information."""

    session_id: str = Field(
        ..., description="Unique session identifier", title="Session ID"
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
