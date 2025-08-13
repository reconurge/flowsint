from pydantic import BaseModel, Field
from typing import Optional, List


class Credential(BaseModel):
    """Represents user credentials with compromise and usage information."""

    username: str = Field(..., description="Username or identifier", title="Username")
    service: Optional[str] = Field(
        None,
        description="Service or platform where credential is used",
        title="Service",
    )
    type: Optional[str] = Field(
        None,
        description="Type of credential (password, token, key, etc.)",
        title="Credential Type",
    )
    first_seen: Optional[str] = Field(
        None, description="First time credential was observed", title="First Seen"
    )
    last_seen: Optional[str] = Field(
        None, description="Last time credential was observed", title="Last Seen"
    )
    is_active: Optional[bool] = Field(
        None, description="Whether credential is currently active", title="Is Active"
    )
    is_compromised: Optional[bool] = Field(
        None,
        description="Whether credential has been compromised",
        title="Is Compromised",
    )
    breach_source: Optional[str] = Field(
        None, description="Source of breach if compromised", title="Breach Source"
    )
    password_hash: Optional[str] = Field(
        None, description="Hashed password (if available)", title="Password Hash"
    )
    hash_type: Optional[str] = Field(
        None, description="Type of hash algorithm used", title="Hash Type"
    )
    associated_emails: Optional[List[str]] = Field(
        None, description="Associated email addresses", title="Associated Emails"
    )
    associated_phones: Optional[List[str]] = Field(
        None, description="Associated phone numbers", title="Associated Phones"
    )
    ip_addresses: Optional[List[str]] = Field(
        None, description="IP addresses used with credential", title="IP Addresses"
    )
    user_agents: Optional[List[str]] = Field(
        None, description="User agents used with credential", title="User Agents"
    )
    locations: Optional[List[str]] = Field(
        None,
        description="Geographic locations where credential was used",
        title="Locations",
    )
    description: Optional[str] = Field(
        None, description="Additional notes about credential", title="Description"
    )
    source: Optional[str] = Field(
        None, description="Source of credential information", title="Source"
    )
