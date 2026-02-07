"""Repository for Log model."""
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from ..models import Log
from .base import BaseRepository


class LogRepository(BaseRepository[Log]):
    model = Log

    def get_by_sketch(
        self,
        sketch_id: UUID,
        limit: int = 100,
        since: Optional[datetime] = None,
    ) -> List[Log]:
        query = (
            self._db.query(Log)
            .filter(Log.sketch_id == sketch_id)
            .order_by(Log.created_at.desc())
        )

        if since:
            query = query.filter(Log.created_at > since)
        else:
            query = query.filter(
                Log.created_at > datetime.utcnow() - timedelta(days=1)
            )

        return query.limit(limit).all()

    def delete_by_sketch(self, sketch_id: UUID) -> int:
        return self._db.query(Log).filter(Log.sketch_id == sketch_id).delete()
