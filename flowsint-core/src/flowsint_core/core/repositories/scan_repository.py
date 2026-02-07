"""Repository for Scan model."""
from typing import List
from uuid import UUID

from ..models import Scan, Sketch, InvestigationUserRole
from ..types import Role
from .base import BaseRepository


class ScanRepository(BaseRepository[Scan]):
    model = Scan

    def get_accessible_by_user(self, user_id: UUID) -> List[Scan]:
        allowed_roles = [Role.OWNER, Role.EDITOR, Role.VIEWER]

        # Get investigation IDs accessible by user
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

        if not inv_ids:
            return []

        return (
            self._db.query(Scan)
            .join(Sketch, Sketch.id == Scan.sketch_id)
            .filter(Sketch.investigation_id.in_(inv_ids))
            .distinct()
            .all()
        )
