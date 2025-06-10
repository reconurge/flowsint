from uuid import UUID
from .base import ORMBase
from pydantic import UUID4, BaseModel
from typing import Optional
from datetime import datetime

class LogCreate(BaseModel):
    content: str
    sketch_id: UUID4
    type: Optional[str] = "INFO"

class LogRead(ORMBase):
    id: UUID4
    content: str
    created_at: datetime
    sketch_id: UUID4
    type: str

class LogSchema(BaseModel):
    id: int
    sketch_id: UUID
    type: str
    content: str
    created_at: datetime