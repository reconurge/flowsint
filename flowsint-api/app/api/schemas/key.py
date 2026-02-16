from datetime import datetime

from pydantic import UUID4, BaseModel

from .base import ORMBase


class KeyCreate(BaseModel):
    key: str
    name: str


class KeyRead(ORMBase):
    id: UUID4
    owner_id: UUID4
    name: str
    created_at: datetime | str


class KeyExists(BaseModel):
    exists: bool
