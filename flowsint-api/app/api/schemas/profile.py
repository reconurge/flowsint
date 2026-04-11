from .base import ORMBase
from pydantic import UUID4, BaseModel, ConfigDict, EmailStr
from typing import Optional


class ProfileCreate(BaseModel):
    email: EmailStr
    password: str


class ProfileRead(ORMBase):
    id: UUID4
    first_name: Optional[str]
    last_name: Optional[str]
    avatar_url: Optional[str]
    email: Optional[str] = None


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
