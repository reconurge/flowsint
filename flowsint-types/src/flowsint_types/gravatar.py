from pydantic import Field, HttpUrl, model_validator
from typing import Optional, List, Self
from .flowsint_base import FlowsintType


class Gravatar(FlowsintType):
    """Represents a Gravatar profile with image and user information."""

    src: HttpUrl = Field(..., description="Gravatar image URL", title="Image URL")
    hash: str = Field(..., description="Gravatar hash", title="Hash")
    size: Optional[int] = Field(
        None, description="Image size in pixels", title="Image Size"
    )
    rating: Optional[str] = Field(
        None, description="Content rating (g, pg, r, x)", title="Content Rating"
    )
    default_image: Optional[str] = Field(
        None,
        description="Default image type when no gravatar exists",
        title="Default Image",
    )
    force_default: Optional[bool] = Field(
        None, description="Whether to force default image", title="Force Default"
    )
    exists: Optional[bool] = Field(
        None, description="Whether the gravatar exists", title="Exists"
    )
    profile_url: Optional[HttpUrl] = Field(
        None, description="URL to the Gravatar profile page", title="Profile URL"
    )
    display_name: Optional[str] = Field(
        None, description="Display name from Gravatar profile", title="Display Name"
    )
    location: Optional[str] = Field(
        None, description="Location from Gravatar profile", title="Location"
    )
    about_me: Optional[str] = Field(
        None, description="Bio/about me text from Gravatar profile", title="About Me"
    )
    thumbnail_url: Optional[HttpUrl] = Field(
        None, description="Smaller version of the image", title="Thumbnail URL"
    )
    large_url: Optional[HttpUrl] = Field(
        None, description="Larger version of the image", title="Large Image URL"
    )

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        # Use display name if available, otherwise hash
        if self.display_name:
            self.label = f"{self.display_name}"
        else:
            self.label = f"{self.hash}"
        return self
