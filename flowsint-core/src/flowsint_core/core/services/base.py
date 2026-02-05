"""
Base service class providing common functionality for all services.
"""

from typing import Type, TypeVar, Optional, List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from .exceptions import DatabaseError, NotFoundError, PermissionDeniedError
from ..models import InvestigationUserRole
from ..types import Role

T = TypeVar("T")


class BaseService:
    """
    Base class for all services.

    Provides common database operations and error handling patterns.
    """

    def __init__(self, db: Session):
        """
        Initialize the service with a database session.

        Args:
            db: SQLAlchemy database session
        """
        self._db = db

    @property
    def db(self) -> Session:
        """Get the database session."""
        return self._db

    def _commit(self) -> None:
        """
        Commit the current transaction.

        Raises:
            DatabaseError: If the commit fails
        """
        try:
            self._db.commit()
        except SQLAlchemyError as e:
            self._db.rollback()
            raise DatabaseError(f"Database error: {e}")

    def _rollback(self) -> None:
        """Rollback the current transaction."""
        self._db.rollback()

    def _flush(self) -> None:
        """
        Flush pending changes to the database.

        Raises:
            DatabaseError: If the flush fails
        """
        try:
            self._db.flush()
        except SQLAlchemyError as e:
            self._db.rollback()
            raise DatabaseError(f"Database error: {e}")

    def _refresh(self, entity: T) -> T:
        """
        Refresh an entity from the database.

        Args:
            entity: The entity to refresh

        Returns:
            The refreshed entity
        """
        self._db.refresh(entity)
        return entity

    def _add(self, entity: T) -> T:
        """
        Add an entity to the session.

        Args:
            entity: The entity to add

        Returns:
            The added entity
        """
        self._db.add(entity)
        return entity

    def _delete(self, entity: T) -> None:
        """
        Mark an entity for deletion.

        Args:
            entity: The entity to delete
        """
        self._db.delete(entity)

    def _get_or_404(self, model: Type[T], id: UUID) -> T:
        """
        Get an entity by ID or raise NotFoundError.

        Args:
            model: The SQLAlchemy model class
            id: The entity ID

        Returns:
            The found entity

        Raises:
            NotFoundError: If the entity is not found
        """
        entity = self._db.query(model).filter(model.id == id).first()
        if not entity:
            raise NotFoundError(f"{model.__name__} not found")
        return entity

    def _get_by_id(self, model: Type[T], id: UUID) -> Optional[T]:
        """
        Get an entity by ID, returning None if not found.

        Args:
            model: The SQLAlchemy model class
            id: The entity ID

        Returns:
            The found entity or None
        """
        return self._db.query(model).filter(model.id == id).first()

    def _get_all(self, model: Type[T]) -> List[T]:
        """
        Get all entities of a given model.

        Args:
            model: The SQLAlchemy model class

        Returns:
            List of all entities
        """
        return self._db.query(model).all()

    def _can_user(self, roles: List[Role], actions: List[str]) -> bool:
        """
        Check if at least one role in the list allows at least one action.

        Args:
            roles: List of user roles
            actions: List of actions to check

        Returns:
            True if any role allows any action
        """
        for role in roles:
            for action in actions:
                if role == Role.OWNER:
                    return True
                if role == Role.EDITOR and action in ["read", "create", "update"]:
                    return True
                if role == Role.VIEWER and action == "read":
                    return True
        return False

    def _check_permission(
        self, user_id: UUID, investigation_id: UUID, actions: List[str]
    ) -> bool:
        """
        Check if a user has permission to perform actions on an investigation.

        Args:
            user_id: The user's ID
            investigation_id: The investigation ID
            actions: List of actions to check

        Returns:
            True if user has permission

        Raises:
            PermissionDeniedError: If user doesn't have permission
        """
        role_entry = (
            self._db.query(InvestigationUserRole)
            .filter_by(user_id=user_id, investigation_id=investigation_id)
            .first()
        )

        if not role_entry or not self._can_user(role_entry.roles, actions):
            raise PermissionDeniedError("Forbidden")
        return True
