"""
Analysis service for managing analyses within investigations.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..models import Analysis, InvestigationUserRole
from ..types import Role
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError


class AnalysisService(BaseService):
    """
    Service for analysis CRUD operations.
    """

    def get_accessible_analyses(self, user_id: UUID) -> List[Analysis]:
        """
        Get all analyses accessible to a user based on their investigation roles.

        Args:
            user_id: The user's ID

        Returns:
            List of accessible analyses
        """
        allowed_roles = [Role.OWNER, Role.EDITOR, Role.VIEWER]

        query = self._db.query(Analysis).join(
            InvestigationUserRole,
            InvestigationUserRole.investigation_id == Analysis.investigation_id,
        )

        query = query.filter(InvestigationUserRole.user_id == user_id)

        conditions = [InvestigationUserRole.roles.any(role) for role in allowed_roles]
        query = query.filter(or_(*conditions))

        return query.distinct().all()

    def get_by_id(self, analysis_id: UUID, user_id: UUID) -> Analysis:
        """
        Get an analysis by ID with permission check.

        Args:
            analysis_id: The analysis ID
            user_id: The user's ID

        Returns:
            The analysis

        Raises:
            NotFoundError: If analysis not found
            PermissionDeniedError: If user doesn't have permission
        """
        analysis = self._db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            raise NotFoundError("Analysis not found")

        self._check_permission(user_id, analysis.investigation_id, ["read"])
        return analysis

    def get_by_investigation(
        self, investigation_id: UUID, user_id: UUID
    ) -> List[Analysis]:
        """
        Get all analyses for an investigation.

        Args:
            investigation_id: The investigation ID
            user_id: The user's ID

        Returns:
            List of analyses

        Raises:
            PermissionDeniedError: If user doesn't have permission
        """
        self._check_permission(user_id, investigation_id, ["read"])

        return (
            self._db.query(Analysis)
            .filter(Analysis.investigation_id == investigation_id)
            .all()
        )

    def create(
        self,
        title: str,
        description: Optional[str],
        content: Optional[Dict[str, Any]],
        investigation_id: UUID,
        owner_id: UUID,
    ) -> Analysis:
        """
        Create a new analysis.

        Args:
            title: Analysis title
            description: Analysis description
            content: Analysis content (JSON)
            investigation_id: Parent investigation ID
            owner_id: Owner user ID

        Returns:
            The created analysis

        Raises:
            PermissionDeniedError: If user can't create in this investigation
        """
        self._check_permission(owner_id, investigation_id, ["create"])

        new_analysis = Analysis(
            id=uuid4(),
            title=title,
            description=description,
            content=content,
            owner_id=owner_id,
            investigation_id=investigation_id,
            created_at=datetime.utcnow(),
            last_updated_at=datetime.utcnow(),
        )
        self._add(new_analysis)
        self._commit()
        self._refresh(new_analysis)
        return new_analysis

    def update(
        self,
        analysis_id: UUID,
        user_id: UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        content: Optional[Dict[str, Any]] = None,
        investigation_id: Optional[UUID] = None,
    ) -> Analysis:
        """
        Update an analysis.

        Args:
            analysis_id: The analysis ID
            user_id: The user's ID
            title: New title (optional)
            description: New description (optional)
            content: New content (optional)
            investigation_id: New investigation ID (optional)

        Returns:
            The updated analysis

        Raises:
            NotFoundError: If analysis not found
            PermissionDeniedError: If user doesn't have permission
        """
        analysis = self._db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            raise NotFoundError("Analysis not found")

        self._check_permission(user_id, analysis.investigation_id, ["update"])

        if title is not None:
            analysis.title = title
        if description is not None:
            analysis.description = description
        if content is not None:
            analysis.content = content
        if investigation_id is not None:
            # Check permission for the new investigation as well
            self._check_permission(user_id, investigation_id, ["update"])
            analysis.investigation_id = investigation_id

        analysis.last_updated_at = datetime.utcnow()
        self._commit()
        self._refresh(analysis)
        return analysis

    def delete(self, analysis_id: UUID, user_id: UUID) -> None:
        """
        Delete an analysis.

        Args:
            analysis_id: The analysis ID
            user_id: The user's ID

        Raises:
            NotFoundError: If analysis not found
            PermissionDeniedError: If user doesn't have permission
        """
        analysis = self._db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            raise NotFoundError("Analysis not found")

        self._check_permission(user_id, analysis.investigation_id, ["delete"])

        self._delete(analysis)
        self._commit()


def create_analysis_service(db: Session) -> AnalysisService:
    """
    Factory function to create an AnalysisService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured AnalysisService instance
    """
    return AnalysisService(db=db)
