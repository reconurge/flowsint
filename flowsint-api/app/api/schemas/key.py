from .base import ORMBase
from pydantic import UUID4, BaseModel
from datetime import datetime


class KeyCreate(BaseModel):
    key: str
    name: str


class KeyRead(ORMBase):
    id: UUID4
    owner_id: UUID4
    name: str
    created_at: datetime
