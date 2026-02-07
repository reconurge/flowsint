"""Repository for CustomType model."""
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func

from ..models import CustomType
from .base import BaseRepository


class CustomTypeRepository(BaseRepository[CustomType]):
    model = CustomType

    def get_by_owner(
        self, owner_id: UUID, status: Optional[str] = None
    ) -> List[CustomType]:
        query = self._db.query(CustomType).filter(CustomType.owner_id == owner_id)
        if status:
            query = query.filter(CustomType.status == status)
        return query.order_by(CustomType.created_at.desc()).all()

    def get_by_id_and_owner(
        self, custom_type_id: UUID, owner_id: UUID
    ) -> Optional[CustomType]:
        return (
            self._db.query(CustomType)
            .filter(
                CustomType.id == custom_type_id,
                CustomType.owner_id == owner_id,
            )
            .first()
        )

    def get_by_name_and_owner(
        self, name: str, owner_id: UUID
    ) -> Optional[CustomType]:
        return (
            self._db.query(CustomType)
            .filter(CustomType.owner_id == owner_id, CustomType.name == name)
            .first()
        )

    def get_published_by_owner(self, owner_id: UUID) -> List[CustomType]:
        return (
            self._db.query(CustomType)
            .filter(
                CustomType.owner_id == owner_id,
                CustomType.status == "published",
            )
            .all()
        )

    def get_published_by_name_and_owner(
        self, name: str, owner_id: UUID
    ) -> Optional[CustomType]:
        return (
            self._db.query(CustomType)
            .filter(
                CustomType.owner_id == owner_id,
                CustomType.status == "published",
                func.lower(CustomType.name) == name.lower(),
            )
            .first()
        )
