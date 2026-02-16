"""Base repository providing common database operations."""
from typing import Generic, List, Optional, Set, Type, TypeVar
from uuid import UUID

from sqlalchemy.orm import Session

from ..models import InvestigationUserRole
from ..types import Role

T = TypeVar("T")


class BaseRepository(Generic[T]):
    """Base class for all repositories. Never calls commit/rollback."""

    model: Type[T]

    def __init__(self, db: Session):
        self._db = db

    def _get_accessible_investigation_ids(
        self, user_id: UUID, allowed_roles: Optional[List[Role]] = None
    ) -> Set[UUID]:
        if allowed_roles is None:
            allowed_roles = [Role.OWNER, Role.EDITOR, Role.VIEWER]
        role_entries = (
            self._db.query(InvestigationUserRole)
            .filter(InvestigationUserRole.user_id == user_id)
            .all()
        )
        inv_ids = set()
        for entry in role_entries:
            for role in entry.roles:
                if role in allowed_roles:
                    inv_ids.add(entry.investigation_id)
                    break
        return inv_ids

    def get_by_id(self, id: UUID) -> Optional[T]:
        return self._db.query(self.model).filter(self.model.id == id).first()

    def get_all(self) -> List[T]:
        return self._db.query(self.model).all()

    def add(self, entity: T) -> T:
        self._db.add(entity)
        return entity

    def delete(self, entity: T) -> None:
        self._db.delete(entity)

    def flush(self) -> None:
        self._db.flush()

    def refresh(self, entity: T) -> T:
        self._db.refresh(entity)
        return entity
