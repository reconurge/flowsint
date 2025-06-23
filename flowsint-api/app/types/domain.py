from pydantic import BaseModel, Field

class Domain(BaseModel):
    domain: str = Field(..., description="Domain name")
Domain.model_rebuild()

