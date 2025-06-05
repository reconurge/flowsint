from pydantic import BaseModel, Field

class Email(BaseModel):
    email: str = Field(..., description="Email address")
