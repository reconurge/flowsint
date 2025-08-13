from .base import ORMBase
from pydantic import UUID4, BaseModel, EmailStr
from typing import Optional


class ProfileCreate(BaseModel):
    email: EmailStr
    password: str


class ProfileRead(ORMBase):
    id: UUID4
    first_name: Optional[str]
    last_name: Optional[str]
    avatar_url: Optional[str]
