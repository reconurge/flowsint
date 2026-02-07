"""
Enricher service for managing enricher operations.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from ..repositories import CustomTypeRepository
from .base import BaseService


class EnricherService(BaseService):
    """
    Service for enricher operations and listing.
    """

    def __init__(self, db: Session, custom_type_repo: CustomTypeRepository, **kwargs):
        super().__init__(db, **kwargs)
        self._custom_type_repo = custom_type_repo

    def get_enrichers(
        self, category: Optional[str], user_id: UUID, enricher_registry
    ) -> List[Dict[str, Any]]:
        if not category or category.lower() == "undefined":
            return enricher_registry.list(exclude=["n8n_connector"])

        custom_type = self._custom_type_repo.get_published_by_name_and_owner(
            category, user_id
        )

        if custom_type:
            return enricher_registry.list(exclude=["n8n_connector"], wobbly_type=True)

        return enricher_registry.list_by_input_type(category, exclude=["n8n_connector"])


def create_enricher_service(db: Session) -> EnricherService:
    return EnricherService(
        db=db,
        custom_type_repo=CustomTypeRepository(db),
    )
