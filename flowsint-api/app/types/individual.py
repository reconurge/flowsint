from pydantic import BaseModel
from typing import Optional

class Individual(BaseModel):
    first_name: str
    last_name: str
    full_name: str
    birth_date: Optional[str] = None
    gender: Optional[str] = None