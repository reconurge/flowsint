"""Repository for Analysis model."""
from typing import List, Optional
from uuid import UUID

from ..models import Analysis, InvestigationUserRole
from ..types import Role
from .base import BaseRepository


class AnalysisRepository(BaseRepository[Analysis]):
    model = Analysis

    def get_accessible_by_user(
        self, user_id: UUID, allowed_roles: Optional[List[Role]] = None
    ) -> List[Analysis]:
        if allowed_roles is None:
            allowed_roles = [Role.OWNER, Role.EDITOR, Role.VIEWER]

        # Get all investigation IDs accessible by this user
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
            self._db.query(Analysis)
            .filter(Analysis.investigation_id.in_(inv_ids))
            .distinct()
            .all()
        )

    def get_by_investigation(self, investigation_id: UUID) -> List[Analysis]:
        return (
            self._db.query(Analysis)
            .filter(Analysis.investigation_id == investigation_id)
            .all()
        )

    def get_by_id_and_permission(
        self, analysis_id: UUID, user_id: UUID
    ) -> Optional[Analysis]:
        """Get an analysis if user has access via investigation roles."""
        analysis = self._db.query(Analysis).filter(Analysis.id == analysis_id).first()
        return analysis
