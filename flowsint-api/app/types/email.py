from pydantic import BaseModel, EmailStr

class Email(BaseModel):
    email: EmailStr
