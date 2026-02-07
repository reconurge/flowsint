"""Repository for Sketch model."""
from typing import List
from uuid import UUID

from ..models import Sketch
from .base import BaseRepository


class SketchRepository(BaseRepository[Sketch]):
    model = Sketch

    def get_by_owner(self, owner_id: UUID) -> List[Sketch]:
        return self._db.query(Sketch).filter(Sketch.owner_id == owner_id).all()

    def get_by_investigation(self, investigation_id: UUID) -> List[Sketch]:
        return (
            self._db.query(Sketch)
            .filter(Sketch.investigation_id == investigation_id)
            .all()
        )
