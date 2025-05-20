from typing import List, Optional, Any
from .base import ORMBase
from pydantic import UUID4, BaseModel
from typing import Optional
from datetime import datetime

class ScanCreate(BaseModel):
    values: Optional[List[str]] = None
    sketch_id: Optional[UUID4] = None
    status: Optional[str] = None
    results: Optional[Any] = None

class ScanRead(ORMBase):
    id: UUID4
    created_at: datetime
    values: Optional[List[str]]
    sketch_id: Optional[UUID4]
    status: Optional[str]
    results: Optional[Any]
