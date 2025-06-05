from pydantic import BaseModel, Field, HttpUrl
from typing import Optional

class MinimalSocial(BaseModel):
    username: Optional[str] = Field(None, description="Username on the social platform")

class Social(BaseModel):
    username: Optional[str] = Field(None, description="Username on the social platform")
    profile_url: str = Field(..., description="URL to the user's profile page")
    platform: Optional[str] = Field(None, description="Name of the social media platform")
    profile_picture_url: Optional[str] = Field(None, description="URL to the user's profile picture")
    bio: Optional[str] = Field(None, description="User's biography or description")
    followers_count: Optional[int] = Field(None, description="Number of followers")
    following_count: Optional[int] = Field(None, description="Number of users being followed")
    posts_count: Optional[int] = Field(None, description="Number of posts made by the user")
   