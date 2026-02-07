"""
Log service for managing event logs.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ..models import Scan
from ..types import Event
from ..enums import EventLevel
from ..repositories import LogRepository, SketchRepository, ScanRepository, InvestigationRepository
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError, DatabaseError


class LogService(BaseService):
    """
    Service for log operations.
    """

    def __init__(
        self,
        db: Session,
        log_repo: LogRepository,
        sketch_repo: SketchRepository,
        scan_repo: ScanRepository,
        investigation_repo: InvestigationRepository,
        **kwargs,
    ):
        super().__init__(db, **kwargs)
        self._log_repo = log_repo
        self._sketch_repo = sketch_repo
        self._scan_repo = scan_repo
        self._investigation_repo = investigation_repo

    def _get_sketch_with_permission(
        self, sketch_id: str, user_id: UUID, actions: List[str]
    ):
        sketch = self._sketch_repo.get_by_id(sketch_id)
        if not sketch:
            raise NotFoundError(f"Sketch with id {sketch_id} not found")
        self._check_permission(user_id, sketch.investigation_id, actions)
        return sketch

    def get_logs_by_sketch(
        self,
        sketch_id: str,
        user_id: UUID,
        limit: int = 100,
        since: Optional[datetime] = None,
    ) -> List[Event]:
        self._get_sketch_with_permission(sketch_id, user_id, ["read"])

        logs = self._log_repo.get_by_sketch(sketch_id, limit=limit, since=since)

        # Reverse to show chronologically (oldest to newest)
        logs = list(reversed(logs))

        results = []
        for log in logs:
            if isinstance(log.content, dict):
                payload = log.content
            elif isinstance(log.content, str):
                payload = {"message": log.content}
            elif log.content is None:
                payload = {}
            else:
                payload = {"content": str(log.content)}

            results.append(
                Event(
                    id=str(log.id),
                    sketch_id=str(log.sketch_id) if log.sketch_id else None,
                    type=log.type,
                    payload=payload,
                    created_at=log.created_at,
                )
            )

        return results

    def delete_logs_by_sketch(self, sketch_id: str, user_id: UUID) -> dict:
        self._get_sketch_with_permission(sketch_id, user_id, ["delete"])

        try:
            self._log_repo.delete_by_sketch(sketch_id)
            self._commit()
            return {"message": "All logs have been deleted successfully"}
        except Exception as e:
            self._rollback()
            raise DatabaseError(f"Failed to delete logs: {str(e)}")

    def get_scan_with_permission(self, scan_id: str, user_id: UUID) -> Scan:
        scan = self._scan_repo.get_by_id(scan_id)
        if not scan:
            raise NotFoundError(f"Scan with id {scan_id} not found")

        sketch = self._sketch_repo.get_by_id(scan.sketch_id)
        if sketch:
            self._check_permission(user_id, sketch.investigation_id, ["read"])

        return scan


def create_log_service(db: Session) -> LogService:
    investigation_repo = InvestigationRepository(db)
    return LogService(
        db=db,
        log_repo=LogRepository(db),
        sketch_repo=SketchRepository(db),
        scan_repo=ScanRepository(db),
        investigation_repo=investigation_repo,
    )
