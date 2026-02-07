"""
Base service class providing common functionality for all services.
"""

from typing import List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from .exceptions import DatabaseError, PermissionDeniedError
from ..types import Role


class BaseService:
    """
    Base class for all services.

    Provides transaction management and authorization helpers.
    Repositories handle all database queries.
    """

    def __init__(self, db: Session, **kwargs):
        self._db = db

    @property
    def db(self) -> Session:
        """Get the database session."""
        return self._db

    def _commit(self) -> None:
        try:
            self._db.commit()
        except SQLAlchemyError as e:
            self._db.rollback()
            raise DatabaseError(f"Database error: {e}")

    def _rollback(self) -> None:
        self._db.rollback()

    def _flush(self) -> None:
        try:
            self._db.flush()
        except SQLAlchemyError as e:
            self._db.rollback()
            raise DatabaseError(f"Database error: {e}")

    def _refresh(self, entity):
        self._db.refresh(entity)
        return entity

    def _can_user(self, roles: List[Role], actions: List[str]) -> bool:
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
        role_entry = self._investigation_repo.get_user_role(user_id, investigation_id)

        if not role_entry or not self._can_user(role_entry.roles, actions):
            raise PermissionDeniedError("Forbidden")
        return True
