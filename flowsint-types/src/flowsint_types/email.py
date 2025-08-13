from pydantic import BaseModel, Field


class Email(BaseModel):
    """Represents an email address."""

    email: str = Field(..., description="Email address", title="Email Address")
