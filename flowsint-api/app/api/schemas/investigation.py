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
    current_user_role: Optional[str] = None


class InvestigationUpdate(BaseModel):
    name: str
    description: Optional[str] = None
    last_updated_at: datetime
    status: str


# ── Collaborator schemas ─────────────────────────────────────────────


class CollaboratorAdd(BaseModel):
    email: str
    role: str  # "admin", "editor", "viewer"


class CollaboratorUpdate(BaseModel):
    role: str  # "admin", "editor", "viewer"


class CollaboratorRead(ORMBase):
    id: UUID4
    user_id: UUID4
    roles: list[str] = []
    user: Optional[ProfileRead] = None
