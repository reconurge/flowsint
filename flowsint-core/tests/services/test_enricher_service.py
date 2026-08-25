"""Tests for EnricherService."""
from unittest.mock import MagicMock
from uuid import uuid4

from flowsint_core.core.services.enricher_service import EnricherService


def test_get_all_enrichers_with_custom_type():
    db = MagicMock()
    custom_type_repo = MagicMock()
    enricher_template_repo = MagicMock()
    registry = MagicMock()

    service = EnricherService(
        db=db,
        custom_type_repo=custom_type_repo,
        enricher_template_repo=enricher_template_repo,
    )

    user_id = uuid4()
    category = "CustomCategory"

    # Mock published custom type returned
    custom_type = MagicMock()
    custom_type_repo.get_published_by_name_and_owner.return_value = custom_type

    registry.list.return_value = [{"name": "base_enricher"}]
    enricher_template_repo.get_by_owner.return_value = [{"name": "template_enricher"}]

    res = service.get_all_enrichers(category, user_id, registry)

    # Called by get_enrichers and again by get_all_enrichers
    assert custom_type_repo.get_published_by_name_and_owner.call_count == 2
    enricher_template_repo.get_by_owner.assert_called_once_with(user_id, None)
    assert res == [{"name": "base_enricher"}, {"name": "template_enricher"}]


def test_get_all_enrichers_with_builtin_category():
    db = MagicMock()
    custom_type_repo = MagicMock()
    enricher_template_repo = MagicMock()
    registry = MagicMock()

    service = EnricherService(
        db=db,
        custom_type_repo=custom_type_repo,
        enricher_template_repo=enricher_template_repo,
    )

    user_id = uuid4()
    category = "Ip"

    # No custom type returned
    custom_type_repo.get_published_by_name_and_owner.return_value = None

    registry.list_by_input_type.return_value = [{"name": "ip_enricher"}]
    enricher_template_repo.get_by_owner.return_value = [{"name": "template_ip"}]

    res = service.get_all_enrichers(category, user_id, registry)

    # Called by get_enrichers and again by get_all_enrichers
    assert custom_type_repo.get_published_by_name_and_owner.call_count == 2
    enricher_template_repo.get_by_owner.assert_called_once_with(user_id, category)
    assert res == [{"name": "ip_enricher"}, {"name": "template_ip"}]
