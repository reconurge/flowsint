"""Repository for Scan model."""

from typing import List
from uuid import UUID

from ..models import Scan, Sketch
from .base import BaseRepository


class ScanRepository(BaseRepository[Scan]):
    model = Scan

    def get_accessible_by_user(self, user_id: UUID) -> List[Scan]:
        inv_ids = self._get_accessible_investigation_ids(user_id)
        if not inv_ids:
            return []

        return (
            self._db.query(Scan)
            .join(Sketch, Sketch.id == Scan.sketch_id)
            .filter(Sketch.investigation_id.in_(inv_ids))
            .all()
        )

    def get_accessible_by_sketch_id(self, user_id: UUID, sketch_id: UUID) -> List[Scan]:
        inv_ids = self._get_accessible_investigation_ids(user_id)
        if not inv_ids:
            return []

        return (
            self._db.query(Scan)
            .join(Sketch, Sketch.id == Scan.sketch_id)
            .filter(Sketch.investigation_id.in_(inv_ids), Sketch.id == sketch_id)
            .all()
        )

    def get_accessible_by_status_and_sketch_id(
        self, user_id: UUID, sketch_id: UUID, status: str
    ) -> List[Scan]:
        inv_ids = self._get_accessible_investigation_ids(user_id)
        if not inv_ids:
            return []

        return (
            self._db.query(Scan)
            .join(Sketch, Sketch.id == Scan.sketch_id)
            .filter(
                Sketch.investigation_id.in_(inv_ids),
                Sketch.id == sketch_id,
                Scan.status == status,
            )
            .all()
        )
