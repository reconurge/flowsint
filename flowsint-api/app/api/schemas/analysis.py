from datetime import datetime
from typing import Any, Optional

from pydantic import UUID4, BaseModel

from .base import ORMBase


class AnalysisCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[Any] = None
    owner_id: Optional[UUID4] = None
    investigation_id: Optional[UUID4] = None


class AnalysisRead(ORMBase):
    id: UUID4
    title: str
    description: Optional[str]
    content: Optional[Any]
    created_at: datetime
    last_updated_at: datetime
    owner_id: Optional[UUID4]
    investigation_id: Optional[UUID4]


class AnalysisUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[Any] = None
    last_updated_at: Optional[datetime] = None
    owner_id: Optional[UUID4] = None
    investigation_id: Optional[UUID4] = None
