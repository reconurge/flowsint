from pydantic import BaseModel, Field
from typing import Optional, List


class WebTracker(BaseModel):
    """Represents a web tracking technology with privacy and compliance information."""

    tracker_id: str = Field(
        ..., description="Unique tracker identifier", title="Tracker ID"
    )
    name: Optional[str] = Field(None, description="Tracker name", title="Name")
    type: Optional[str] = Field(
        None, description="Type of tracker (analytics, advertising, etc.)", title="Type"
    )
    domain: Optional[str] = Field(
        None, description="Domain where tracker is deployed", title="Domain"
    )
    script_url: Optional[str] = Field(
        None, description="URL of tracking script", title="Script URL"
    )
    company: Optional[str] = Field(
        None, description="Company providing the tracker", title="Company"
    )
    purpose: Optional[str] = Field(
        None, description="Purpose of tracking", title="Purpose"
    )
    data_collected: Optional[List[str]] = Field(
        None, description="Types of data collected", title="Data Collected"
    )
    privacy_policy: Optional[str] = Field(
        None, description="Privacy policy URL", title="Privacy Policy"
    )
    opt_out_url: Optional[str] = Field(
        None, description="Opt-out URL", title="Opt-out URL"
    )
    first_seen: Optional[str] = Field(
        None, description="First time tracker was observed", title="First Seen"
    )
    last_seen: Optional[str] = Field(
        None, description="Last time tracker was observed", title="Last Seen"
    )
    is_active: Optional[bool] = Field(
        None, description="Whether tracker is currently active", title="Is Active"
    )
    is_third_party: Optional[bool] = Field(
        None, description="Whether tracker is third-party", title="Is Third Party"
    )
    cookie_duration: Optional[int] = Field(
        None, description="Cookie duration in days", title="Cookie Duration"
    )
    gdpr_compliant: Optional[bool] = Field(
        None, description="Whether tracker is GDPR compliant", title="GDPR Compliant"
    )
    source: Optional[str] = Field(
        None, description="Source of tracker information", title="Source"
    )
    risk_level: Optional[str] = Field(
        None, description="Privacy risk level", title="Risk Level"
    )
