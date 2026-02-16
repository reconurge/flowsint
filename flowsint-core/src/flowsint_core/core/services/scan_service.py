"""
Scan service for managing scans.
"""

from typing import List
from uuid import UUID

from sqlalchemy.orm import Session

from ..models import Scan
from ..repositories import InvestigationRepository, ScanRepository, SketchRepository
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError


class ScanService(BaseService):
    """
    Service for scan operations.
    """

    def __init__(
        self,
        db: Session,
        scan_repo: ScanRepository,
        sketch_repo: SketchRepository,
        investigation_repo: InvestigationRepository,
        **kwargs,
    ):
        super().__init__(db, **kwargs)
        self._scan_repo = scan_repo
        self._sketch_repo = sketch_repo
        self._investigation_repo = investigation_repo

    def get_accessible_scans(self, user_id: UUID) -> List[Scan]:
        return self._scan_repo.get_accessible_by_user(user_id)

    def get_accessible_scans_by_sketch_id(
        self, user_id: UUID, sketch_id: UUID
    ) -> List[Scan]:
        return self._scan_repo.get_accessible_by_sketch_id(user_id, sketch_id)

    def get_accessible_scans_by_status_and_sketch_id(
        self, user_id: UUID, sketch_id: UUID, status: str
    ) -> List[Scan]:
        return self._scan_repo.get_accessible_by_status_and_sketch_id(
            user_id, sketch_id, status
        )

    def get_by_id(self, scan_id: UUID, user_id: UUID) -> Scan:
        scan = self._scan_repo.get_by_id(scan_id)
        if not scan:
            raise NotFoundError("Scan not found")

        sketch = self._sketch_repo.get_by_id(scan.sketch_id)
        if sketch:
            self._check_permission(user_id, sketch.investigation_id, ["read"])

        return scan

    def delete(self, scan_id: UUID, user_id: UUID) -> None:
        scan = self._scan_repo.get_by_id(scan_id)
        if not scan:
            raise NotFoundError("Scan not found")

        sketch = self._sketch_repo.get_by_id(scan.sketch_id)
        if sketch:
            self._check_permission(user_id, sketch.investigation_id, ["delete"])

        self._scan_repo.delete(scan)
        self._commit()


def create_scan_service(db: Session) -> ScanService:
    investigation_repo = InvestigationRepository(db)
    return ScanService(
        db=db,
        scan_repo=ScanRepository(db),
        sketch_repo=SketchRepository(db),
        investigation_repo=investigation_repo,
    )
