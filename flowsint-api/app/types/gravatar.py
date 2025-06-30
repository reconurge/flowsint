from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List

class Gravatar(BaseModel):
    src: HttpUrl = Field(..., description="Gravatar image URL")
    hash: str = Field(..., description="Gravatar hash")
    size: Optional[int] = Field(None, description="Image size in pixels")
    rating: Optional[str] = Field(None, description="Content rating (g, pg, r, x)")
    default_image: Optional[str] = Field(None, description="Default image type when no gravatar exists")
    force_default: Optional[bool] = Field(None, description="Whether to force default image")
    exists: Optional[bool] = Field(None, description="Whether the gravatar exists")
    profile_url: Optional[HttpUrl] = Field(None, description="URL to the Gravatar profile page")
    display_name: Optional[str] = Field(None, description="Display name from Gravatar profile")
    location: Optional[str] = Field(None, description="Location from Gravatar profile")
    about_me: Optional[str] = Field(None, description="Bio/about me text from Gravatar profile")
    thumbnail_url: Optional[HttpUrl] = Field(None, description="Smaller version of the image")
    large_url: Optional[HttpUrl] = Field(None, description="Larger version of the image")
