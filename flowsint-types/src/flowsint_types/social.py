from pydantic import BaseModel, Field
from typing import Optional


class SocialProfile(BaseModel):
    """Represents a social media profile with engagement metrics."""

    username: str = Field(
        ..., description="Username on the social platform", title="Username"
    )
    profile_url: Optional[str] = Field(
        None, description="URL to the user's profile page", title="Profile URL"
    )
    platform: Optional[str] = Field(
        None, description="Name of the social media platform", title="Platform"
    )
    profile_picture_url: Optional[str] = Field(
        None, description="URL to the user's profile picture", title="Profile Picture"
    )
    bio: Optional[str] = Field(
        None, description="User's biography or description", title="Bio"
    )
    followers_count: Optional[int] = Field(
        None, description="Number of followers", title="Followers Count"
    )
    following_count: Optional[int] = Field(
        None, description="Number of users being followed", title="Following Count"
    )
    posts_count: Optional[int] = Field(
        None, description="Number of posts made by the user", title="Posts Count"
    )
