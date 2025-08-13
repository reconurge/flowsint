from .base import ORMBase
from pydantic import UUID4, BaseModel
from typing import Optional
from datetime import datetime


class InvestigationProfileCreate(BaseModel):
    investigation_id: UUID4
    profile_id: UUID4
    role: Optional[str] = "member"


class InvestigationProfileRead(ORMBase):
    id: int
    created_at: datetime
    investigation_id: UUID4
    profile_id: UUID4
    role: str
