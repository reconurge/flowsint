"""Repository for Flow model."""
from typing import List, Optional
from uuid import UUID

from ..models import Flow
from .base import BaseRepository


class FlowRepository(BaseRepository[Flow]):
    model = Flow

    def get_all_with_optional_category(
        self, category: Optional[str] = None
    ) -> List[Flow]:
        query = self._db.query(Flow).order_by(Flow.last_updated_at.desc())

        if not category or category.lower() == "undefined":
            return query.all()

        flows = query.all()
        return [
            flow
            for flow in flows
            if flow.category
            and any(cat.lower() == category.lower() for cat in flow.category)
        ]
