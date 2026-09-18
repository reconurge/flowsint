"""
Enricher service for managing enricher operations.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy.orm import Session

from ...templates.types import TemplateSecret, params_schema_from_secrets
from ..repositories import CustomTypeRepository, EnricherTemplateRepository
from .base import BaseService


def template_params_schema(content: Any) -> List[Dict[str, Any]]:
    """Derive a params schema from a stored template's `secrets` block.

    Stored content is unvalidated JSON, so a secret that does not parse is
    dropped instead of failing the whole enricher listing.
    """
    if not isinstance(content, dict):
        return []

    secrets = []
    for raw_secret in content.get("secrets") or []:
        try:
            secrets.append(TemplateSecret.model_validate(raw_secret))
        except ValidationError:
            continue

    return params_schema_from_secrets(secrets)


class EnricherService(BaseService):
    """
    Service for enricher operations and listing.
    """

    def __init__(
        self,
        db: Session,
        custom_type_repo: CustomTypeRepository,
        enricher_template_repo: EnricherTemplateRepository,
        **kwargs: Any,
    ):
        super().__init__(db, **kwargs)
        self._custom_type_repo = custom_type_repo
        self._enricher_template_repo = enricher_template_repo

    # enricher_registry is flowsint_enrichers' EnricherRegistry. That package
    # ships no py.typed marker, so naming the class would resolve to Any
    # anyway; saying Any avoids the cross-package import for no loss.
    def get_enrichers(
        self,
        category: Optional[str],
        user_id: UUID,
        enricher_registry: Any,
    ) -> List[Dict[str, Any]]:
        if not category or category.lower() == "undefined":
            all_enrichers: List[Dict[str, Any]] = enricher_registry.list(
                exclude=["n8n_connector"]
            )
            return all_enrichers

        custom_type = self._custom_type_repo.get_published_by_name_and_owner(
            category, user_id
        )

        if custom_type:
            return []

        by_input_type: List[Dict[str, Any]] = enricher_registry.list_by_input_type(
            category, exclude=["n8n_connector"]
        )
        return by_input_type

    def get_all_enrichers(
        self, category: Optional[str], user_id: UUID, enricher_registry: Any
    ) -> list:
        base_enrichers = self.get_enrichers(category, user_id, enricher_registry)
        # Owner-or-public, matching what the launch path resolves a template
        # name against. Listing only owned templates left another user's public
        # template launchable but invisible, so its params_schema never reached
        # the UI and the launch failed on a missing required param.
        template_enrichers = self._enricher_template_repo.get_by_owner_or_public(
            user_id, category
        )
        for template in template_enrichers:
            # Unmapped attributes: they reach the response because FastAPI's
            # encoder reads the instance __dict__, and SQLAlchemy never tries
            # to persist a key it has no column for.
            params_schema = template_params_schema(template.content)
            template.params_schema = params_schema  # type: ignore[attr-defined]
            template.required_params = any(  # type: ignore[attr-defined]
                param["required"] for param in params_schema
            )
        return [*base_enrichers, *template_enrichers]


def create_enricher_service(db: Session) -> EnricherService:
    return EnricherService(
        db=db,
        custom_type_repo=CustomTypeRepository(db),
        enricher_template_repo=EnricherTemplateRepository(db),
    )
