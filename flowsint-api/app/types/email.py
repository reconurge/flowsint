from typing import Optional
from pydantic import BaseModel, Field
from app.types.gravatar import Gravatar

class Email(BaseModel):
    email: str = Field(..., description="Email address")
    gravatar: Optional[Gravatar] = Field(None, description="Gravatar")
