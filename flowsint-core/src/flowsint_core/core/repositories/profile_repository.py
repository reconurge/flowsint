"""Repository for Profile model."""
from typing import Optional

from ..models import Profile
from .base import BaseRepository


class ProfileRepository(BaseRepository[Profile]):
    model = Profile

    def get_by_email(self, email: str) -> Optional[Profile]:
        return self._db.query(Profile).filter(Profile.email == email).first()
