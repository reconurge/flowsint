from typing import Any, List, Optional

from pydantic import UUID4, BaseModel

from .base import ORMBase


class ScanCreate(BaseModel):
    values: Optional[List[str]] = None
    sketch_id: Optional[UUID4] = None
    status: Optional[str] = None
    details: Optional[Any] = None


class ScanRead(ORMBase):
    id: UUID4
    sketch_id: Optional[UUID4]
    status: Optional[str]
