from .base import ORMBase
from pydantic import UUID4, BaseModel
from typing import Optional
from datetime import datetime
from typing import List, Optional, Dict, Any

class TransformCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[List[str]] = None
    transform_schema: Optional[Dict[str, Any]] = None

class TransformRead(ORMBase):
    id: UUID4
    name: str
    description: Optional[str]
    category: Optional[List[str]]
    transform_schema: Optional[Dict[str, Any]]
    created_at: datetime
    last_updated_at: datetime

class TransformUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[List[str]] = None
    transform_schema: Optional[Dict[str, Any]] = None
