from pydantic import BaseModel, Field
from typing import Optional, List


class Username(BaseModel):
    """Represents a username or handle on a platform with associated profile information."""

    username: str = Field(..., description="Username or handle", title="Username")
    platform: Optional[str] = Field(
        None, description="Platform or service where username is used", title="Platform"
    )
    display_name: Optional[str] = Field(
        None, description="Display name associated with username", title="Display Name"
    )
    created_at: Optional[str] = Field(
        None, description="Account creation date", title="Creation Date"
    )
    last_seen: Optional[str] = Field(
        None, description="Last activity timestamp", title="Last Seen"
    )
    followers_count: Optional[int] = Field(
        None, description="Number of followers", title="Followers Count"
    )
    following_count: Optional[int] = Field(
        None, description="Number of accounts being followed", title="Following Count"
    )
    posts_count: Optional[int] = Field(
        None, description="Number of posts or content items", title="Posts Count"
    )
    verified: Optional[bool] = Field(
        None, description="Whether account is verified", title="Verified"
    )
    bio: Optional[str] = Field(
        None, description="User biography or description", title="Bio"
    )
    location: Optional[str] = Field(None, description="User location", title="Location")
    website: Optional[str] = Field(
        None, description="User website URL", title="Website"
    )
    avatar_url: Optional[str] = Field(
        None, description="Profile picture URL", title="Avatar URL"
    )
    is_private: Optional[bool] = Field(
        None, description="Whether account is private", title="Is Private"
    )
    is_suspended: Optional[bool] = Field(
        None, description="Whether account is suspended", title="Is Suspended"
    )
    associated_emails: Optional[List[str]] = Field(
        None, description="Associated email addresses", title="Associated Emails"
    )
    associated_phones: Optional[List[str]] = Field(
        None, description="Associated phone numbers", title="Associated Phones"
    )
