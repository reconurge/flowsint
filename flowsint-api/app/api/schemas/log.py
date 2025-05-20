from uuid import UUID
from .base import ORMBase
from pydantic import UUID4, BaseModel
from typing import Optional
from datetime import datetime

class LogCreate(BaseModel):
    scan_id: UUID4
    content: str
    sketch_id: Optional[UUID4] = None
    type: Optional[str] = "INFO"

class LogRead(ORMBase):
    id: UUID4
    scan_id: UUID4
    content: str
    created_at: datetime
    sketch_id: Optional[UUID4]
    type: str

class LogSchema(BaseModel):
    id: int
    scan_id: UUID
    sketch_id: UUID | None = None
    type: str
    content: str
    created_at: datetime