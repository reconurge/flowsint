"""Repository for Investigation and InvestigationUserRole models."""
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import selectinload

from ..models import Investigation, InvestigationUserRole
from ..types import Role
from .base import BaseRepository


class InvestigationRepository(BaseRepository[Investigation]):
    model = Investigation

    def get_accessible_by_user(
        self, user_id: UUID, allowed_roles: Optional[List[Role]] = None
    ) -> List[Investigation]:
        query = self._db.query(Investigation).join(
            InvestigationUserRole,
            InvestigationUserRole.investigation_id == Investigation.id,
        )
        query = query.filter(InvestigationUserRole.user_id == user_id)

        if allowed_roles:
            # Filter by checking if user has any matching role
            role_entries = (
                self._db.query(InvestigationUserRole)
                .filter(InvestigationUserRole.user_id == user_id)
                .all()
            )
            inv_ids = set()
            for entry in role_entries:
                for role in entry.roles:
                    if role in allowed_roles:
                        inv_ids.add(entry.investigation_id)
                        break
            query = query.filter(Investigation.id.in_(inv_ids))

        return (
            query.options(
                selectinload(Investigation.sketches),
                selectinload(Investigation.analyses),
                selectinload(Investigation.owner),
            )
            .distinct()
            .all()
        )

    def get_with_relations(
        self, investigation_id: UUID, owner_id: UUID
    ) -> Optional[Investigation]:
        return (
            self._db.query(Investigation)
            .options(
                selectinload(Investigation.sketches),
                selectinload(Investigation.analyses),
                selectinload(Investigation.owner),
            )
            .filter(
                Investigation.id == investigation_id,
                Investigation.owner_id == owner_id,
            )
            .first()
        )

    def get_by_id_and_owner(
        self, investigation_id: UUID, owner_id: UUID
    ) -> Optional[Investigation]:
        return (
            self._db.query(Investigation)
            .filter(
                Investigation.id == investigation_id,
                Investigation.owner_id == owner_id,
            )
            .first()
        )

    def get_user_role(
        self, user_id: UUID, investigation_id: UUID
    ) -> Optional[InvestigationUserRole]:
        return (
            self._db.query(InvestigationUserRole)
            .filter_by(user_id=user_id, investigation_id=investigation_id)
            .first()
        )

    def add_user_role(self, role_entry: InvestigationUserRole) -> InvestigationUserRole:
        self._db.add(role_entry)
        return role_entry
