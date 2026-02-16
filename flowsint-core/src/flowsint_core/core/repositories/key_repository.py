"""Repository for Key model."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import exists

from ..models import Key
from .base import BaseRepository

CHAT_KEY_NAMES = ["MISTRAL_API_KEY"]


class KeyRepository(BaseRepository[Key]):
    model = Key

    def get_by_owner(self, owner_id: UUID) -> List[Key]:
        return self._db.query(Key).filter(Key.owner_id == owner_id).all()

    def get_by_name_and_owner(self, owner_id: UUID, name: str) -> Key | None:
        return (
            self._db.query(Key)
            .filter(Key.owner_id == owner_id)
            .filter(Key.name == name)
            .first()
        )

    def get_by_id_and_owner(self, key_id: UUID, owner_id: UUID) -> Optional[Key]:
        return (
            self._db.query(Key)
            .filter(Key.id == key_id, Key.owner_id == owner_id)
            .first()
        )

    def chat_key_exist(self, owner_id: UUID) -> bool:
        return self._db.query(
            exists().where(Key.owner_id == owner_id, Key.name.in_(CHAT_KEY_NAMES))
        ).scalar()
