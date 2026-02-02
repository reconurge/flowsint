"""
Enricher template service for managing enricher template operations.
"""

from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..models import EnricherTemplate
from .base import BaseService
from .exceptions import ConflictError, NotFoundError, PermissionDeniedError


class EnricherTemplateService(BaseService):
    """Service for enricher template CRUD and lookup operations."""

    def create_template(
        self,
        name: str,
        description: Optional[str],
        category: str,
        version: float,
        content: dict,
        is_public: bool,
        owner_id: UUID,
    ) -> EnricherTemplate:
        self._check_duplicate_name(name, owner_id)

        template = EnricherTemplate(
            name=name,
            description=description,
            category=category,
            version=version,
            content=content,
            is_public=is_public,
            owner_id=owner_id,
        )
        self._add(template)
        self._commit()
        self._refresh(template)
        return template

    def list_templates(
        self,
        owner_id: UUID,
        category: Optional[str] = None,
        include_public: bool = True,
    ) -> List[EnricherTemplate]:
        if include_public:
            query = self._db.query(EnricherTemplate).filter(
                or_(
                    EnricherTemplate.owner_id == owner_id,
                    EnricherTemplate.is_public,
                )
            )
        else:
            query = self._db.query(EnricherTemplate).filter(
                EnricherTemplate.owner_id == owner_id
            )

        if category:
            query = query.filter(EnricherTemplate.category == category)

        return query.order_by(EnricherTemplate.created_at.desc()).all()

    def get_template(self, template_id: UUID, user_id: UUID) -> EnricherTemplate:
        template = (
            self._db.query(EnricherTemplate)
            .filter(
                EnricherTemplate.id == template_id,
                or_(
                    EnricherTemplate.owner_id == user_id,
                    EnricherTemplate.is_public,
                ),
            )
            .first()
        )
        if not template:
            raise NotFoundError("Template not found")
        return template

    def get_owned_template(
        self, template_id: UUID, owner_id: UUID
    ) -> EnricherTemplate:
        template = (
            self._db.query(EnricherTemplate)
            .filter(
                EnricherTemplate.id == template_id,
                EnricherTemplate.owner_id == owner_id,
            )
            .first()
        )
        if not template:
            raise NotFoundError("Template not found")
        return template

    def update_template(
        self,
        template_id: UUID,
        owner_id: UUID,
        update_data: dict,
    ) -> EnricherTemplate:
        template = self.get_owned_template(template_id, owner_id)

        content = update_data.get("content")
        if content is not None:
            new_name = content.get("name")
            if new_name and new_name != template.name:
                self._check_duplicate_name(new_name, owner_id, exclude_id=template_id)
                template.name = new_name

            new_category = content.get("category")
            if new_category:
                template.category = new_category

            new_version = content.get("version")
            if new_version is not None:
                template.version = float(new_version)

            template.description = content.get("description")
            template.content = content

        # Explicit field updates override content values
        if update_data.get("name") is not None:
            self._check_duplicate_name(
                update_data["name"], owner_id, exclude_id=template_id
            )
            template.name = update_data["name"]

        if update_data.get("category") is not None:
            template.category = update_data["category"]

        if update_data.get("description") is not None:
            template.description = update_data["description"]

        if update_data.get("version") is not None:
            template.version = update_data["version"]

        if update_data.get("is_public") is not None:
            template.is_public = update_data["is_public"]

        self._commit()
        self._refresh(template)
        return template

    def delete_template(self, template_id: UUID, owner_id: UUID) -> None:
        template = self.get_owned_template(template_id, owner_id)
        self._delete(template)
        self._commit()

    def find_by_name(self, name: str, user_id: UUID) -> Optional[EnricherTemplate]:
        return (
            self._db.query(EnricherTemplate)
            .filter(
                EnricherTemplate.name == name,
                or_(
                    EnricherTemplate.owner_id == user_id,
                    EnricherTemplate.is_public,
                ),
            )
            .first()
        )

    def list_by_category_for_user(
        self, owner_id: UUID, category: Optional[str] = None
    ) -> List[EnricherTemplate]:
        query = self._db.query(EnricherTemplate).filter(
            EnricherTemplate.owner_id == owner_id
        )
        if category:
            query = query.filter(EnricherTemplate.category == category)
        return query.order_by(EnricherTemplate.created_at.desc()).all()

    def _check_duplicate_name(
        self,
        name: str,
        owner_id: UUID,
        exclude_id: Optional[UUID] = None,
    ) -> None:
        query = self._db.query(EnricherTemplate).filter(
            EnricherTemplate.owner_id == owner_id,
            EnricherTemplate.name == name,
        )
        if exclude_id:
            query = query.filter(EnricherTemplate.id != exclude_id)
        if query.first():
            raise ConflictError(f"Template with name '{name}' already exists")


def create_enricher_template_service(db: Session) -> EnricherTemplateService:
    """Factory function to create an EnricherTemplateService instance."""
    return EnricherTemplateService(db=db)
