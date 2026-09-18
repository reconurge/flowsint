"""Tests for EnricherService listing, focused on template-enricher params."""

from unittest.mock import MagicMock

from flowsint_core.core.repositories import (
    CustomTypeRepository,
    EnricherTemplateRepository,
)
from flowsint_core.core.services.enricher_service import EnricherService
from tests.factories import EnricherTemplateFactory, ProfileFactory


def _content(secrets):
    return {
        "name": "example",
        "category": "Ip",
        "version": 1.0,
        "input": {"type": "Ip"},
        "request": {"url": "https://api.example.com/{{address}}"},
        "response": {},
        "output": {"type": "Ip"},
        "secrets": secrets,
    }


class TestGetAllEnrichers:
    def _setup(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        EnricherTemplateFactory._meta.sqlalchemy_session = db_session

    def _make_service(self, db_session):
        return EnricherService(
            db=db_session,
            custom_type_repo=CustomTypeRepository(db_session),
            enricher_template_repo=EnricherTemplateRepository(db_session),
        )

    def _list(self, db_session, user):
        registry = MagicMock()
        registry.list.return_value = []
        return self._make_service(db_session).get_all_enrichers(None, user.id, registry)

    def test_template_secrets_become_params_schema(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        EnricherTemplateFactory(
            owner=user,
            name="github-lookup",
            content=_content(
                [
                    {
                        "name": "GITHUB_TOKEN",
                        "required": True,
                        "description": "Personal access token",
                    },
                    {"name": "OPTIONAL_KEY", "required": False},
                ]
            ),
        )

        [template] = self._list(db_session, user)

        assert template.params_schema == [
            {
                "name": "GITHUB_TOKEN",
                "type": "vaultSecret",
                "required": True,
                "description": "Personal access token",
            },
            {
                "name": "OPTIONAL_KEY",
                "type": "vaultSecret",
                "required": False,
                "description": None,
            },
        ]
        assert template.required_params is True

    def test_template_without_required_secrets_is_not_required(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        EnricherTemplateFactory(
            owner=user,
            content=_content([{"name": "OPTIONAL_KEY", "required": False}]),
        )

        [template] = self._list(db_session, user)

        assert template.required_params is False

    def test_template_without_secrets_gets_an_empty_schema(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        EnricherTemplateFactory(owner=user, content=_content([]))

        [template] = self._list(db_session, user)

        assert template.params_schema == []
        assert template.required_params is False

    def test_malformed_secret_is_dropped_rather_than_failing_the_listing(
        self, db_session
    ):
        self._setup(db_session)
        user = ProfileFactory()
        EnricherTemplateFactory(
            owner=user,
            content=_content([{"nope": 1}, {"name": "GOOD_KEY", "required": True}]),
        )

        [template] = self._list(db_session, user)

        assert [param["name"] for param in template.params_schema] == ["GOOD_KEY"]

    def test_template_with_non_dict_content_gets_an_empty_schema(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        EnricherTemplateFactory(owner=user, content=["not", "a", "dict"])

        [template] = self._list(db_session, user)

        assert template.params_schema == []
