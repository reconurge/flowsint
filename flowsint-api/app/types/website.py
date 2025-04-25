from typing import Optional
from pydantic import BaseModel, HttpUrl
from app.types.domain import Domain

class Website(BaseModel):
    url: HttpUrl
    domain: Domain