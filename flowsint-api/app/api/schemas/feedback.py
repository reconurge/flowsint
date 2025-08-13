from .base import ORMBase
from pydantic import UUID4, BaseModel
from typing import Optional
from datetime import datetime


class FeedbackCreate(BaseModel):
    content: Optional[str] = None
    owner_id: Optional[UUID4] = None


class FeedbackRead(ORMBase):
    id: int
    created_at: datetime
    content: Optional[str] = None
    owner_id: Optional[UUID4]
