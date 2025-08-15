from .base import ORMBase
from pydantic import UUID4, BaseModel
from typing import Optional
from datetime import datetime
from .sketch import SketchRead
from .analysis import AnalysisRead
from .profile import ProfileRead


class InvestigationCreate(BaseModel):
    name: str
    description: str
    owner_id: Optional[UUID4] = None
    status: Optional[str] = "active"


class InvestigationRead(ORMBase):
    id: UUID4
    created_at: datetime
    name: str
    description: str
    owner_id: Optional[UUID4]
    last_updated_at: datetime
    status: str
    owner: Optional[ProfileRead] = None
    sketches: list[SketchRead] = []
    analyses: list[AnalysisRead] = []


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


class InvestigationUpdate(BaseModel):
    name: str
    description: Optional[str] = None
    last_updated_at: datetime
    status: str
