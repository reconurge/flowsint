"""Repository for Key model."""
from typing import List, Optional
from uuid import UUID

from ..models import Key
from .base import BaseRepository


class KeyRepository(BaseRepository[Key]):
    model = Key

    def get_by_owner(self, owner_id: UUID) -> List[Key]:
        return self._db.query(Key).filter(Key.owner_id == owner_id).all()

    def get_by_id_and_owner(
        self, key_id: UUID, owner_id: UUID
    ) -> Optional[Key]:
        return (
            self._db.query(Key)
            .filter(Key.id == key_id, Key.owner_id == owner_id)
            .first()
        )
