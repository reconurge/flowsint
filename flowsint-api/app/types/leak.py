from typing import List, Dict
from pydantic import BaseModel
from typing import Optional

class Leak(BaseModel):
    leaks: Optional[List[Dict]] = None
    breaches: Optional[List[Dict]] = None
