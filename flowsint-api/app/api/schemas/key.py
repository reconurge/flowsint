from .base import ORMBase
from pydantic import UUID4, BaseModel
from datetime import datetime

class ThirdPartyKeyCreate(BaseModel):
    key: str
    service: str
    
class ThirdPartyKeyRead(ORMBase):
    id: UUID4
    owner_id: UUID4
    encrypted_key: str
    service: str
    created_at: datetime
