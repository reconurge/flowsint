"""Tests for EnricherTemplateService."""
import pytest

from tests.factories import EnricherTemplateFactory, ProfileFactory
from flowsint_core.core.repositories import EnricherTemplateRepository
from flowsint_core.core.services.enricher_template_service import (
    EnricherTemplateService,
)
from flowsint_core.core.services.exceptions import ConflictError, NotFoundError


class TestEnricherTemplateService:
    def _setup(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        EnricherTemplateFactory._meta.sqlalchemy_session = db_session

    def _make_service(self, db_session):
        repo = EnricherTemplateRepository(db_session)
        return EnricherTemplateService(db=db_session, enricher_template_repo=repo)

    # -- create_template --

    def test_create_template(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        service = self._make_service(db_session)

        template = service.create_template(
            name="My Template",
            description="desc",
            category="ip",
            version=1.0,
            content={"name": "My Template"},
            is_public=False,
            owner_id=user.id,
        )

        assert template.id is not None
        assert template.name == "My Template"
        assert template.owner_id == user.id

    def test_create_template_duplicate_name_raises(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        EnricherTemplateFactory(owner=user, name="Dup")
        service = self._make_service(db_session)

        with pytest.raises(ConflictError):
            service.create_template(
                name="Dup",
                description=None,
                category="ip",
                version=1.0,
                content={"name": "Dup"},
                is_public=False,
                owner_id=user.id,
            )

    # -- list_templates --

    def test_list_templates_includes_public(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        other = ProfileFactory()
        EnricherTemplateFactory(owner=user, name="Mine")
        EnricherTemplateFactory(owner=other, name="Public", is_public=True)
        EnricherTemplateFactory(owner=other, name="Private", is_public=False)
        service = self._make_service(db_session)

        results = service.list_templates(user.id, include_public=True)

        names = {t.name for t in results}
        assert "Mine" in names
        assert "Public" in names
        assert "Private" not in names

    def test_list_templates_exclude_public(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        other = ProfileFactory()
        EnricherTemplateFactory(owner=user, name="Mine")
        EnricherTemplateFactory(owner=other, name="Public", is_public=True)
        service = self._make_service(db_session)

        results = service.list_templates(user.id, include_public=False)

        assert len(results) == 1
        assert results[0].name == "Mine"

    def test_list_templates_filter_by_category(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        EnricherTemplateFactory(owner=user, category="ip")
        EnricherTemplateFactory(owner=user, category="domain")
        service = self._make_service(db_session)

        results = service.list_templates(user.id, category="ip")

        assert len(results) == 1
        assert results[0].category == "ip"

    # -- get_template --

    def test_get_template_own(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        t = EnricherTemplateFactory(owner=user)
        service = self._make_service(db_session)

        result = service.get_template(t.id, user.id)
        assert result.id == t.id

    def test_get_template_public(self, db_session):
        self._setup(db_session)
        owner = ProfileFactory()
        viewer = ProfileFactory()
        t = EnricherTemplateFactory(owner=owner, is_public=True)
        service = self._make_service(db_session)

        result = service.get_template(t.id, viewer.id)
        assert result.id == t.id

    def test_get_template_not_found(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        other = ProfileFactory()
        t = EnricherTemplateFactory(owner=other, is_public=False)
        service = self._make_service(db_session)

        with pytest.raises(NotFoundError):
            service.get_template(t.id, user.id)

    # -- get_owned_template --

    def test_get_owned_template(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        t = EnricherTemplateFactory(owner=user)
        service = self._make_service(db_session)

        result = service.get_owned_template(t.id, user.id)
        assert result.id == t.id

    def test_get_owned_template_wrong_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        other = ProfileFactory()
        t = EnricherTemplateFactory(owner=user)
        service = self._make_service(db_session)

        with pytest.raises(NotFoundError):
            service.get_owned_template(t.id, other.id)

    # -- update_template --

    def test_update_template_fields(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        t = EnricherTemplateFactory(owner=user, name="Old", category="ip")
        service = self._make_service(db_session)

        updated = service.update_template(
            t.id, user.id, {"name": "New", "category": "domain", "is_public": True}
        )

        assert updated.name == "New"
        assert updated.category == "domain"
        assert updated.is_public is True

    def test_update_template_content(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        t = EnricherTemplateFactory(owner=user, name="T1", version=1.0)
        service = self._make_service(db_session)

        new_content = {"name": "T2", "category": "domain", "version": 2.0, "description": "new desc"}
        updated = service.update_template(t.id, user.id, {"content": new_content})

        assert updated.name == "T2"
        assert updated.category == "domain"
        assert updated.version == 2.0
        assert updated.content == new_content

    def test_update_template_duplicate_name_raises(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        EnricherTemplateFactory(owner=user, name="Taken")
        t = EnricherTemplateFactory(owner=user, name="Original")
        service = self._make_service(db_session)

        with pytest.raises(ConflictError):
            service.update_template(t.id, user.id, {"name": "Taken"})

    def test_update_template_not_owner_raises(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        other = ProfileFactory()
        t = EnricherTemplateFactory(owner=user)
        service = self._make_service(db_session)

        with pytest.raises(NotFoundError):
            service.update_template(t.id, other.id, {"name": "Hack"})

    # -- delete_template --

    def test_delete_template(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        t = EnricherTemplateFactory(owner=user)
        service = self._make_service(db_session)

        service.delete_template(t.id, user.id)

        with pytest.raises(NotFoundError):
            service.get_owned_template(t.id, user.id)

    def test_delete_template_not_owner_raises(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        other = ProfileFactory()
        t = EnricherTemplateFactory(owner=user)
        service = self._make_service(db_session)

        with pytest.raises(NotFoundError):
            service.delete_template(t.id, other.id)

    # -- find_by_name --

    def test_find_by_name_own(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        EnricherTemplateFactory(owner=user, name="Finder")
        service = self._make_service(db_session)

        result = service.find_by_name("Finder", user.id)
        assert result is not None
        assert result.name == "Finder"

    def test_find_by_name_public(self, db_session):
        self._setup(db_session)
        owner = ProfileFactory()
        viewer = ProfileFactory()
        EnricherTemplateFactory(owner=owner, name="PubFind", is_public=True)
        service = self._make_service(db_session)

        result = service.find_by_name("PubFind", viewer.id)
        assert result is not None

    def test_find_by_name_not_found(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        service = self._make_service(db_session)

        result = service.find_by_name("Ghost", user.id)
        assert result is None

    # -- list_by_category_for_user --

    def test_list_by_category_for_user(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        other = ProfileFactory()
        EnricherTemplateFactory(owner=user, category="ip")
        EnricherTemplateFactory(owner=user, category="domain")
        EnricherTemplateFactory(owner=other, category="ip", is_public=True)
        service = self._make_service(db_session)

        results = service.list_by_category_for_user(user.id, category="ip")

        assert len(results) == 1
        assert results[0].owner_id == user.id
