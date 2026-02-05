"""
Investigation service for managing investigations and user roles.
"""

from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from ..models import Investigation, InvestigationUserRole, Sketch, Analysis
from ..types import Role
from ..graph import create_graph_service
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError, DatabaseError


class InvestigationService(BaseService):
    """
    Service for investigation CRUD operations and role management.
    """

    def get_accessible_investigations(
        self, user_id: UUID, allowed_roles: Optional[List[Role]] = None
    ) -> List[Investigation]:
        """
        Get all investigations accessible to a user based on their roles.

        Args:
            user_id: The user's ID
            allowed_roles: Optional list of roles to filter by

        Returns:
            List of accessible investigations
        """
        query = self._db.query(Investigation).join(
            InvestigationUserRole,
            InvestigationUserRole.investigation_id == Investigation.id,
        )

        query = query.filter(InvestigationUserRole.user_id == user_id)

        if allowed_roles:
            conditions = [
                InvestigationUserRole.roles.any(role) for role in allowed_roles
            ]
            query = query.filter(or_(*conditions, Investigation.owner_id == user_id))

        return (
            query.options(
                selectinload(Investigation.sketches),
                selectinload(Investigation.analyses),
                selectinload(Investigation.owner),
            )
            .distinct()
            .all()
        )

    def get_by_id(self, investigation_id: UUID, user_id: UUID) -> Investigation:
        """
        Get an investigation by ID with permission check.

        Args:
            investigation_id: The investigation ID
            user_id: The user's ID

        Returns:
            The investigation

        Raises:
            PermissionDeniedError: If user doesn't have read permission
            NotFoundError: If investigation not found
        """
        self._check_permission(user_id, investigation_id, actions=["read"])

        investigation = (
            self._db.query(Investigation)
            .options(
                selectinload(Investigation.sketches),
                selectinload(Investigation.analyses),
                selectinload(Investigation.owner),
            )
            .filter(Investigation.id == investigation_id)
            .filter(Investigation.owner_id == user_id)
            .first()
        )
        if not investigation:
            raise NotFoundError("Investigation not found")
        return investigation

    def get_sketches(self, investigation_id: UUID, user_id: UUID) -> List[Sketch]:
        """
        Get all sketches for an investigation.

        Args:
            investigation_id: The investigation ID
            user_id: The user's ID

        Returns:
            List of sketches

        Raises:
            PermissionDeniedError: If user doesn't have read permission
            NotFoundError: If no sketches found
        """
        self._check_permission(user_id, investigation_id, actions=["read"])

        sketches = (
            self._db.query(Sketch)
            .filter(Sketch.investigation_id == investigation_id)
            .all()
        )
        if not sketches:
            raise NotFoundError("No sketches found for this investigation")
        return sketches

    def create(
        self, name: str, description: Optional[str], owner_id: UUID
    ) -> Investigation:
        """
        Create a new investigation with owner role.

        Args:
            name: Investigation name
            description: Investigation description
            owner_id: The owner's user ID

        Returns:
            The created investigation
        """
        new_investigation = Investigation(
            id=uuid4(),
            name=name,
            description=description or name,
            owner_id=owner_id,
            status="active",
        )
        self._add(new_investigation)

        new_roles = InvestigationUserRole(
            id=uuid4(),
            user_id=owner_id,
            investigation_id=new_investigation.id,
            roles=[Role.OWNER],
        )
        self._add(new_roles)

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
        """
        Update an investigation.

        Args:
            investigation_id: The investigation ID
            user_id: The user's ID
            name: New name
            description: New description
            status: New status

        Returns:
            The updated investigation

        Raises:
            PermissionDeniedError: If user doesn't have write permission
            NotFoundError: If investigation not found
        """
        self._check_permission(user_id, investigation_id, actions=["write"])

        investigation = (
            self._db.query(Investigation)
            .filter(Investigation.id == investigation_id)
            .first()
        )
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
        """
        Delete an investigation and all related data.

        Args:
            investigation_id: The investigation ID
            user_id: The user's ID

        Raises:
            PermissionDeniedError: If user doesn't have delete permission
            NotFoundError: If investigation not found
            DatabaseError: If graph cleanup fails
        """
        self._check_permission(user_id, investigation_id, actions=["delete"])

        investigation = (
            self._db.query(Investigation)
            .filter(
                Investigation.id == investigation_id,
                Investigation.owner_id == user_id,
            )
            .first()
        )
        if not investigation:
            raise NotFoundError("Investigation not found")

        # Get all sketches related to this investigation
        sketches = (
            self._db.query(Sketch)
            .filter(Sketch.investigation_id == investigation_id)
            .all()
        )
        analyses = (
            self._db.query(Analysis)
            .filter(Analysis.investigation_id == investigation_id)
            .all()
        )

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

        # Delete all sketches and analyses from PostgreSQL
        for sketch in sketches:
            self._delete(sketch)
        for analysis in analyses:
            self._delete(analysis)

        # Finally delete the investigation
        self._delete(investigation)
        self._commit()


def create_investigation_service(db: Session) -> InvestigationService:
    """
    Factory function to create an InvestigationService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured InvestigationService instance
    """
    return InvestigationService(db=db)
