"""
Investigation service for managing investigations and user roles.
"""

from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from sqlalchemy.orm import Session

from ..models import Investigation, InvestigationUserRole, Sketch, Analysis
from ..types import Role
from ..graph import create_graph_service
from ..repositories import InvestigationRepository, SketchRepository, AnalysisRepository
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError, DatabaseError


class InvestigationService(BaseService):
    """
    Service for investigation CRUD operations and role management.
    """

    def __init__(
        self,
        db: Session,
        investigation_repo: InvestigationRepository,
        sketch_repo: SketchRepository,
        analysis_repo: AnalysisRepository,
        **kwargs,
    ):
        super().__init__(db, **kwargs)
        self._investigation_repo = investigation_repo
        self._sketch_repo = sketch_repo
        self._analysis_repo = analysis_repo

    def get_accessible_investigations(
        self, user_id: UUID, allowed_roles: Optional[List[Role]] = None
    ) -> List[Investigation]:
        return self._investigation_repo.get_accessible_by_user(user_id, allowed_roles)

    def get_by_id(self, investigation_id: UUID, user_id: UUID) -> Investigation:
        self._check_permission(user_id, investigation_id, actions=["read"])

        investigation = self._investigation_repo.get_with_relations(
            investigation_id, user_id
        )
        if not investigation:
            raise NotFoundError("Investigation not found")
        return investigation

    def get_sketches(self, investigation_id: UUID, user_id: UUID) -> List[Sketch]:
        self._check_permission(user_id, investigation_id, actions=["read"])

        sketches = self._sketch_repo.get_by_investigation(investigation_id)
        if not sketches:
            raise NotFoundError("No sketches found for this investigation")
        return sketches

    def create(
        self, name: str, description: Optional[str], owner_id: UUID
    ) -> Investigation:
        new_investigation = Investigation(
            id=uuid4(),
            name=name,
            description=description or name,
            owner_id=owner_id,
            status="active",
        )
        self._investigation_repo.add(new_investigation)

        new_roles = InvestigationUserRole(
            id=uuid4(),
            user_id=owner_id,
            investigation_id=new_investigation.id,
            roles=[Role.OWNER],
        )
        self._investigation_repo.add_user_role(new_roles)

        self._commit()
        self._refresh(new_investigation)

        return new_investigation

    def update(
        self,
        investigation_id: UUID,
        user_id: UUID,
        name: str,
        description: str,
        status: str,
    ) -> Investigation:
        self._check_permission(user_id, investigation_id, actions=["write"])

        investigation = self._investigation_repo.get_by_id(investigation_id)
        if not investigation:
            raise NotFoundError("Investigation not found")

        investigation.name = name
        investigation.description = description
        investigation.status = status
        investigation.last_updated_at = datetime.utcnow()

        self._commit()
        self._refresh(investigation)
        return investigation

    def delete(self, investigation_id: UUID, user_id: UUID) -> None:
        self._check_permission(user_id, investigation_id, actions=["delete"])

        investigation = self._investigation_repo.get_by_id_and_owner(
            investigation_id, user_id
        )
        if not investigation:
            raise NotFoundError("Investigation not found")

        sketches = self._sketch_repo.get_by_investigation(investigation_id)
        analyses = self._analysis_repo.get_by_investigation(investigation_id)

        # Delete all nodes and relationships for each sketch in Neo4j
        for sketch in sketches:
            try:
                graph_service = create_graph_service(
                    sketch_id=str(sketch.id),
                    enable_batching=False,
                )
                graph_service.delete_all_sketch_nodes()
            except Exception as e:
                print(f"Neo4j cleanup error for sketch {sketch.id}: {e}")
                raise DatabaseError("Failed to clean up graph data")

        for sketch in sketches:
            self._sketch_repo.delete(sketch)
        for analysis in analyses:
            self._analysis_repo.delete(analysis)

        self._investigation_repo.delete(investigation)
        self._commit()


def create_investigation_service(db: Session) -> InvestigationService:
    investigation_repo = InvestigationRepository(db)
    return InvestigationService(
        db=db,
        investigation_repo=investigation_repo,
        sketch_repo=SketchRepository(db),
        analysis_repo=AnalysisRepository(db),
    )
