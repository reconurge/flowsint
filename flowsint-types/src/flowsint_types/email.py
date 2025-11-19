from pydantic import BaseModel, Field, EmailStr, model_validator
from typing import Any


class Email(BaseModel):
    """Represents an email address."""

    email: EmailStr = Field(..., description="Email address", title="Email Address")

    @model_validator(mode='before')
    @classmethod
    def convert_string_to_dict(cls, data: Any) -> Any:
        """Allow creating Email from a string directly."""
        if isinstance(data, str):
            return {'email': data}
        return data
