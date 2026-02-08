"""Repository for EnricherTemplate model."""
from typing import List, Optional
from uuid import UUID

from sqlalchemy import or_

from ..models import EnricherTemplate
from .base import BaseRepository


class EnricherTemplateRepository(BaseRepository[EnricherTemplate]):
    model = EnricherTemplate

    def get_by_owner_or_public(
        self, owner_id: UUID, category: Optional[str] = None
    ) -> List[EnricherTemplate]:
        query = self._db.query(EnricherTemplate).filter(
            or_(
                EnricherTemplate.owner_id == owner_id,
                EnricherTemplate.is_public,
            )
        )
        if category:
            query = query.filter(EnricherTemplate.category == category)
        return query.order_by(EnricherTemplate.created_at.desc()).all()

    def get_by_owner(
        self, owner_id: UUID, category: Optional[str] = None
    ) -> List[EnricherTemplate]:
        query = self._db.query(EnricherTemplate).filter(
            EnricherTemplate.owner_id == owner_id
        )
        if category:
            query = query.filter(EnricherTemplate.category == category)
        return query.order_by(EnricherTemplate.created_at.desc()).all()

    def get_by_id_and_owner_or_public(
        self, template_id: UUID, user_id: UUID
    ) -> Optional[EnricherTemplate]:
        return (
            self._db.query(EnricherTemplate)
            .filter(
                EnricherTemplate.id == template_id,
                or_(
                    EnricherTemplate.owner_id == user_id,
                    EnricherTemplate.is_public,
                ),
            )
            .first()
        )

    def get_by_id_and_owner(
        self, template_id: UUID, owner_id: UUID
    ) -> Optional[EnricherTemplate]:
        return (
            self._db.query(EnricherTemplate)
            .filter(
                EnricherTemplate.id == template_id,
                EnricherTemplate.owner_id == owner_id,
            )
            .first()
        )

    def find_by_name_and_owner_or_public(
        self, name: str, user_id: UUID
    ) -> Optional[EnricherTemplate]:
        return (
            self._db.query(EnricherTemplate)
            .filter(
                EnricherTemplate.name == name,
                or_(
                    EnricherTemplate.owner_id == user_id,
                    EnricherTemplate.is_public,
                ),
            )
            .first()
        )

    def find_by_name_and_owner(
        self, name: str, owner_id: UUID, exclude_id: Optional[UUID] = None
    ) -> Optional[EnricherTemplate]:
        query = self._db.query(EnricherTemplate).filter(
            EnricherTemplate.owner_id == owner_id,
            EnricherTemplate.name == name,
        )
        if exclude_id:
            query = query.filter(EnricherTemplate.id != exclude_id)
        return query.first()
