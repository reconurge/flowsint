from pydantic import BaseModel, Field
from typing import Optional, List


class Device(BaseModel):
    """Represents a device with hardware, software, and network information."""

    device_id: str = Field(
        ..., description="Unique device identifier", title="Device ID"
    )
    type: Optional[str] = Field(
        None,
        description="Type of device (mobile, desktop, server, etc.)",
        title="Device Type",
    )
    manufacturer: Optional[str] = Field(
        None, description="Device manufacturer", title="Manufacturer"
    )
    model: Optional[str] = Field(None, description="Device model", title="Model")
    os: Optional[str] = Field(
        None, description="Operating system", title="Operating System"
    )
    os_version: Optional[str] = Field(
        None, description="Operating system version", title="OS Version"
    )
    browser: Optional[str] = Field(None, description="Browser used", title="Browser")
    browser_version: Optional[str] = Field(
        None, description="Browser version", title="Browser Version"
    )
    screen_resolution: Optional[str] = Field(
        None, description="Screen resolution", title="Screen Resolution"
    )
    user_agent: Optional[str] = Field(
        None, description="User agent string", title="User Agent"
    )
    mac_address: Optional[str] = Field(
        None, description="MAC address", title="MAC Address"
    )
    ip_addresses: Optional[List[str]] = Field(
        None, description="IP addresses associated with device", title="IP Addresses"
    )
    first_seen: Optional[str] = Field(
        None, description="First time device was observed", title="First Seen"
    )
    last_seen: Optional[str] = Field(
        None, description="Last time device was observed", title="Last Seen"
    )
    location: Optional[str] = Field(
        None, description="Geographic location", title="Location"
    )
    is_mobile: Optional[bool] = Field(
        None, description="Whether device is mobile", title="Is Mobile"
    )
    is_tablet: Optional[bool] = Field(
        None, description="Whether device is a tablet", title="Is Tablet"
    )
    is_desktop: Optional[bool] = Field(
        None, description="Whether device is a desktop", title="Is Desktop"
    )
    associated_users: Optional[List[str]] = Field(
        None, description="Users associated with device", title="Associated Users"
    )
    source: Optional[str] = Field(
        None, description="Source of device information", title="Source"
    )
