from pydantic import BaseModel, Field
from typing import Optional

class Phrase(BaseModel):
    """Represents a phrase or text content."""
    text: str = Field(..., description="The content of the phrase.", title="Phrase text value.")
    
