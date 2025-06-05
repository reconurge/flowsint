from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class Leak(BaseModel):
    leaks: Optional[List[Dict]] = Field(None, description="List of data leaks found")
    breaches: Optional[List[Dict]] = Field(None, description="List of security breaches found")
