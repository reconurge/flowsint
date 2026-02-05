"""
Enricher service for managing enricher operations.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import CustomType
from .base import BaseService


class EnricherService(BaseService):
    """
    Service for enricher operations and listing.
    """

    def get_enrichers(
        self, category: Optional[str], user_id: UUID, enricher_registry
    ) -> List[Dict[str, Any]]:
        """
        Get enrichers, optionally filtered by category.

        Args:
            category: Optional category filter
            user_id: The user's ID
            enricher_registry: The enricher registry instance

        Returns:
            List of enrichers
        """
        if not category or category.lower() == "undefined":
            return enricher_registry.list(exclude=["n8n_connector"])

        # Check if category is a custom type
        custom_type = (
            self._db.query(CustomType)
            .filter(
                CustomType.owner_id == user_id,
                CustomType.status == "published",
                func.lower(CustomType.name) == category.lower(),
            )
            .first()
        )

        if custom_type:
            return enricher_registry.list(exclude=["n8n_connector"], wobbly_type=True)

        return enricher_registry.list_by_input_type(category, exclude=["n8n_connector"])


def create_enricher_service(db: Session) -> EnricherService:
    """
    Factory function to create an EnricherService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured EnricherService instance
    """
    return EnricherService(db=db)
