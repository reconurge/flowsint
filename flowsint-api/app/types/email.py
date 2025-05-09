from pydantic import BaseModel

class Email(BaseModel):
    email: str
