"""
Analysis service for managing analyses within investigations.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from sqlalchemy.orm import Session

from ..models import Analysis
from ..repositories import AnalysisRepository, InvestigationRepository
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError


class AnalysisService(BaseService):
    """
    Service for analysis CRUD operations.
    """

    def __init__(
        self,
        db: Session,
        analysis_repo: AnalysisRepository,
        investigation_repo: InvestigationRepository,
        **kwargs,
    ):
        super().__init__(db, **kwargs)
        self._analysis_repo = analysis_repo
        self._investigation_repo = investigation_repo

    def get_accessible_analyses(self, user_id: UUID) -> List[Analysis]:
        return self._analysis_repo.get_accessible_by_user(user_id)

    def get_by_id(self, analysis_id: UUID, user_id: UUID) -> Analysis:
        analysis = self._analysis_repo.get_by_id(analysis_id)
        if not analysis:
            raise NotFoundError("Analysis not found")

        self._check_permission(user_id, analysis.investigation_id, ["read"])
        return analysis

    def get_by_investigation(
        self, investigation_id: UUID, user_id: UUID
    ) -> List[Analysis]:
        self._check_permission(user_id, investigation_id, ["read"])
        return self._analysis_repo.get_by_investigation(investigation_id)

    def create(
        self,
        title: str,
        description: Optional[str],
        content: Optional[Dict[str, Any]],
        investigation_id: UUID,
        owner_id: UUID,
    ) -> Analysis:
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
        self._analysis_repo.add(new_analysis)
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
        analysis = self._analysis_repo.get_by_id(analysis_id)
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
            self._check_permission(user_id, investigation_id, ["update"])
            analysis.investigation_id = investigation_id

        analysis.last_updated_at = datetime.utcnow()
        self._commit()
        self._refresh(analysis)
        return analysis

    def delete(self, analysis_id: UUID, user_id: UUID) -> None:
        analysis = self._analysis_repo.get_by_id(analysis_id)
        if not analysis:
            raise NotFoundError("Analysis not found")

        self._check_permission(user_id, analysis.investigation_id, ["delete"])

        self._analysis_repo.delete(analysis)
        self._commit()


def create_analysis_service(db: Session) -> AnalysisService:
    investigation_repo = InvestigationRepository(db)
    return AnalysisService(
        db=db,
        analysis_repo=AnalysisRepository(db),
        investigation_repo=investigation_repo,
    )
