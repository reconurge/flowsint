"""
Scan service for managing scans.
"""

from typing import List
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..models import Scan, Sketch, InvestigationUserRole
from ..types import Role
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError


class ScanService(BaseService):
    """
    Service for scan operations.
    """

    def get_accessible_scans(self, user_id: UUID) -> List[Scan]:
        """
        Get all scans accessible to a user based on their investigation roles.

        Args:
            user_id: The user's ID

        Returns:
            List of accessible scans
        """
        allowed_roles = [Role.OWNER, Role.EDITOR, Role.VIEWER]

        query = (
            self._db.query(Scan)
            .join(Sketch, Sketch.id == Scan.sketch_id)
            .join(
                InvestigationUserRole,
                InvestigationUserRole.investigation_id == Sketch.investigation_id,
            )
        )

        query = query.filter(InvestigationUserRole.user_id == user_id)

        conditions = [InvestigationUserRole.roles.any(role) for role in allowed_roles]
        query = query.filter(or_(*conditions))

        return query.distinct().all()

    def get_by_id(self, scan_id: UUID, user_id: UUID) -> Scan:
        """
        Get a scan by ID with permission check.

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
            raise NotFoundError("Scan not found")

        # Check investigation permission via sketch
        sketch = self._db.query(Sketch).filter(Sketch.id == scan.sketch_id).first()
        if sketch:
            self._check_permission(user_id, sketch.investigation_id, ["read"])

        return scan

    def delete(self, scan_id: UUID, user_id: UUID) -> None:
        """
        Delete a scan.

        Args:
            scan_id: The scan ID
            user_id: The user's ID

        Raises:
            NotFoundError: If scan not found
            PermissionDeniedError: If user doesn't have permission
        """
        scan = self._db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            raise NotFoundError("Scan not found")

        # Check investigation permission via sketch
        sketch = self._db.query(Sketch).filter(Sketch.id == scan.sketch_id).first()
        if sketch:
            self._check_permission(user_id, sketch.investigation_id, ["delete"])

        self._delete(scan)
        self._commit()


def create_scan_service(db: Session) -> ScanService:
    """
    Factory function to create a ScanService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured ScanService instance
    """
    return ScanService(db=db)
