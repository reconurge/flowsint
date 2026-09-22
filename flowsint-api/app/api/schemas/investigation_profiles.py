from datetime import datetime
from typing import Optional

from pydantic import UUID4, BaseModel

from .base import ORMBase


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
