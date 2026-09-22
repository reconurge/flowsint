from datetime import datetime
from typing import Optional

from pydantic import UUID4, BaseModel

from .base import ORMBase


class FeedbackCreate(BaseModel):
    content: Optional[str] = None
    owner_id: Optional[UUID4] = None


class FeedbackRead(ORMBase):
    id: int
    created_at: datetime
    content: Optional[str] = None
    owner_id: Optional[UUID4]
