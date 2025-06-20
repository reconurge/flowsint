from pydantic import BaseModel, Field
from typing import Dict, Any
from datetime import datetime
from app.core.enums import EventLevel

class Event(BaseModel):
    id: str = Field(..., description="Unique identifier for the event")
    sketch_id: str = Field(..., description="ID of the sketch")
    type: EventLevel = Field(..., description="Type of event")
    payload: Dict[str, Any] = Field(..., description="Payload of the event")
    created_at: datetime = Field(default_factory=datetime.now, description="Timestamp when the event was created")