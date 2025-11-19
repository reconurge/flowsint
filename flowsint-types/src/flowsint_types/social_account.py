from pydantic import Field, model_validator
from typing import Optional, List, Self
from .username import Username
from .flowsint_base import FlowsintType


class SocialAccount(FlowsintType):
    """Represents a social media account (the 'home' of a username)."""

    username: Username = Field(..., description="Username associated with this account", title="Username")
    display_name: Optional[str] = Field(None, description="Display name or full name on the profile", title="Display name")
    profile_url: Optional[str] = Field(None, description="URL to the account profile page", title="Profile URL")
    profile_picture_url: Optional[str] = Field(None, description="URL to the profile avatar/picture", title="Image URL")
    bio: Optional[str] = Field(None, description="Biography or description text", title="Bio")
    location: Optional[str] = Field(None, description="Location specified in the profile", title="Location")
    platform: Optional[str] = Field(None, description="Platform/Website URL from the profile", title="Platform")
    created_at: Optional[str] = Field(None, description="Account creation date", title="Created at")
    followers_count: Optional[int] = Field(None, description="Number of followers", title="Followers count")
    following_count: Optional[int] = Field(None, description="Number of accounts being followed", title="Following count")
    posts_count: Optional[int] = Field(None, description="Number of posts/tweets/content items", title="Posts count")
    verified: Optional[bool] = Field(None, description="Whether the account is verified", title="Verified")
    is_private: Optional[bool] = Field(None, description="Whether the account is private/protected", title="Is private")
    is_suspended: Optional[bool] = Field(None, description="Whether the account is suspended/banned", title="Is suspended")
    associated_emails: Optional[List[str]] = Field(None, description="Email addresses associated with the account", title="Associated emails")
    associated_phones: Optional[List[str]] = Field(None, description="Phone numbers associated with the account", title="Associated phones")

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        # Use display name if available, otherwise username
        if self.display_name:
            self.label = f"{self.display_name} (@{self.username.value})"
        else:
            self.label = f"@{self.username.value}"
        return self
