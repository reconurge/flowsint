from pydantic import BaseModel

class ORMBase(BaseModel):
    class Config:
        from_attributes = True
