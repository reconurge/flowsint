"""
Log service for managing event logs.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ..models import Log, Sketch, Scan
from ..types import Event
from ..enums import EventLevel
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError, DatabaseError


class LogService(BaseService):
    """
    Service for log operations.
    """

    def _get_sketch_with_permission(
        self, sketch_id: str, user_id: UUID, actions: List[str]
    ) -> Sketch:
        """Get sketch and verify user has permission."""
        sketch = self._db.query(Sketch).filter(Sketch.id == sketch_id).first()
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
        """
        Get historical logs for a specific sketch.

        Args:
            sketch_id: The sketch ID
            user_id: The user's ID
            limit: Maximum number of logs to return
            since: Only return logs after this time

        Returns:
            List of Event objects

        Raises:
            NotFoundError: If sketch not found
            PermissionDeniedError: If user doesn't have permission
        """
        self._get_sketch_with_permission(sketch_id, user_id, ["read"])

        query = (
            self._db.query(Log)
            .filter(Log.sketch_id == sketch_id)
            .order_by(Log.created_at.desc())
        )

        if since:
            query = query.filter(Log.created_at > since)
        else:
            # Default to last 24 hours if no since parameter
            query = query.filter(Log.created_at > datetime.utcnow() - timedelta(days=1))

        logs = query.limit(limit).all()

        # Reverse to show chronologically (oldest to newest)
        logs = list(reversed(logs))

        results = []
        for log in logs:
            # Ensure payload is always a dictionary
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
        """
        Delete all logs for a specific sketch.

        Args:
            sketch_id: The sketch ID
            user_id: The user's ID

        Returns:
            Success message

        Raises:
            NotFoundError: If sketch not found
            PermissionDeniedError: If user doesn't have permission
            DatabaseError: If deletion fails
        """
        self._get_sketch_with_permission(sketch_id, user_id, ["delete"])

        try:
            self._db.query(Log).filter(Log.sketch_id == sketch_id).delete()
            self._commit()
            return {"message": "All logs have been deleted successfully"}
        except Exception as e:
            self._rollback()
            raise DatabaseError(f"Failed to delete logs: {str(e)}")

    def get_scan_with_permission(self, scan_id: str, user_id: UUID) -> Scan:
        """
        Get a scan and verify user has permission via sketch.

        Args:
            scan_id: The scan ID
            user_id: The user's ID

        Returns:
            The scan

        Raises:
            NotFoundError: If scan not found
            PermissionDeniedError: If user doesn't have permission
        """
        scan = self._db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            raise NotFoundError(f"Scan with id {scan_id} not found")

        sketch = self._db.query(Sketch).filter(Sketch.id == scan.sketch_id).first()
        if sketch:
            self._check_permission(user_id, sketch.investigation_id, ["read"])

        return scan


def create_log_service(db: Session) -> LogService:
    """
    Factory function to create a LogService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured LogService instance
    """
    return LogService(db=db)
