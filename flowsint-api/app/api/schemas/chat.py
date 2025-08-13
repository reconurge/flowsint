from .base import ORMBase
from pydantic import UUID4, BaseModel
from typing import List, Optional, Any
from datetime import datetime


class ChatMessageRead(BaseModel):
    id: UUID4
    content: Optional[Any] = None
    is_bot: bool
    created_at: datetime
    chat_id: UUID4
    context: Optional[Any] = None

    class Config:
        from_attributes = True


class ChatCreate(BaseModel):
    title: str
    description: Optional[str] = None
    owner_id: Optional[UUID4] = None
    investigation_id: Optional[UUID4] = None


class ChatRead(ORMBase):
    id: UUID4
    title: str
    description: Optional[str]
    created_at: datetime
    last_updated_at: datetime
    owner_id: Optional[UUID4]
    investigation_id: Optional[UUID4]
    messages: List[ChatMessageRead]
