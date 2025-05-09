from pydantic import BaseModel, HttpUrl
from typing import Optional

class MinimalSocial(BaseModel):
    username: Optional[str] = None

class Social(BaseModel):
    username: Optional[str] = None
    profile_url: str
    platform: Optional[str] = None
    profile_picture_url: Optional[str] = None
    bio: Optional[str] = None
    followers_count: Optional[int] = None
    following_count: Optional[int] = None
    posts_count: Optional[int] = None
   