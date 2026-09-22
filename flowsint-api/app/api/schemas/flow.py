from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import UUID4, BaseModel

from .base import ORMBase


class FlowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[List[str]] = None
    flow_schema: Optional[Dict[str, Any]] = None


class FlowRead(ORMBase):
    id: UUID4
    name: str
    description: Optional[str]
    category: Optional[List[str]]
    flow_schema: Optional[Dict[str, Any]]
    owner_id: Optional[UUID4]
    created_at: datetime
    last_updated_at: datetime


class FlowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[List[str]] = None
    flow_schema: Optional[Dict[str, Any]] = None
