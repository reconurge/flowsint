"""Base repository providing common database operations."""
from typing import Generic, List, Optional, Type, TypeVar
from uuid import UUID

from sqlalchemy.orm import Session

T = TypeVar("T")


class BaseRepository(Generic[T]):
    """Base class for all repositories. Never calls commit/rollback."""

    model: Type[T]

    def __init__(self, db: Session):
        self._db = db

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
