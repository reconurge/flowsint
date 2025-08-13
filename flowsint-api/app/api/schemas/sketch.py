from .base import ORMBase
from pydantic import UUID4, BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class SketchCreate(BaseModel):
    title: str
    description: str
    owner_id: Optional[UUID4] = None
    investigation_id: UUID4
    status: Optional[str] = "active"


class SketchRead(ORMBase):
    id: UUID4
    title: str
    description: str
    created_at: datetime
    owner_id: Optional[UUID4]
    investigation_id: UUID4
    last_updated_at: datetime
    status: str


class SketchProfileCreate(BaseModel):
    sketch_id: UUID4
    profile_id: UUID4
    role: Optional[str] = "editor"


class SketchProfileRead(ORMBase):
    id: int
    created_at: datetime
    sketch_id: UUID4
    profile_id: UUID4
    role: str


class SketchUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[UUID] = None
    status: Optional[str] = None
    investigation_id: Optional[UUID] = None


class SketchIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[UUID] = None
    status: Optional[str] = "active"
    investigation_id: UUID  # requis
