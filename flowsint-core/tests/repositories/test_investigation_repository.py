"""Tests for InvestigationRepository."""
from uuid import uuid4

from tests.factories import (
    InvestigationFactory,
    InvestigationUserRoleFactory,
    ProfileFactory,
)
from flowsint_core.core.models import InvestigationUserRole
from flowsint_core.core.repositories import InvestigationRepository
from flowsint_core.core.types import Role


class TestInvestigationRepository:
    def _setup(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        InvestigationFactory._meta.sqlalchemy_session = db_session
        InvestigationUserRoleFactory._meta.sqlalchemy_session = db_session

    def test_get_by_id(self, db_session):
        self._setup(db_session)
        inv = InvestigationFactory()

        repo = InvestigationRepository(db_session)
        result = repo.get_by_id(inv.id)

        assert result is not None
        assert result.name == inv.name

    def test_get_accessible_by_user(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        InvestigationUserRoleFactory(
            user=user, investigation=inv, roles=[Role.OWNER]
        )

        # Another user's investigation (should not appear)
        other_user = ProfileFactory()
        other_inv = InvestigationFactory(owner=other_user)
        InvestigationUserRoleFactory(
            user=other_user, investigation=other_inv, roles=[Role.OWNER]
        )

        repo = InvestigationRepository(db_session)
        results = repo.get_accessible_by_user(user.id)

        assert len(results) == 1
        assert results[0].id == inv.id

    def test_get_accessible_by_user_with_role_filter(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory()
        InvestigationUserRoleFactory(
            user=user, investigation=inv, roles=[Role.VIEWER]
        )

        repo = InvestigationRepository(db_session)

        # Filter with OWNER only — should not match VIEWER
        results = repo.get_accessible_by_user(user.id, [Role.OWNER])
        assert len(results) == 0

        # Filter with VIEWER — should match
        results = repo.get_accessible_by_user(user.id, [Role.VIEWER])
        assert len(results) == 1

    def test_get_with_relations(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)

        repo = InvestigationRepository(db_session)
        result = repo.get_with_relations(inv.id, user.id)

        assert result is not None
        assert result.id == inv.id

    def test_get_with_relations_wrong_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        other_user = ProfileFactory()

        repo = InvestigationRepository(db_session)
        result = repo.get_with_relations(inv.id, other_user.id)
        assert result is None

    def test_get_by_id_and_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)

        repo = InvestigationRepository(db_session)
        result = repo.get_by_id_and_owner(inv.id, user.id)

        assert result is not None
        assert result.id == inv.id

    def test_get_user_role(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory()
        role_entry = InvestigationUserRoleFactory(
            user=user, investigation=inv, roles=[Role.EDITOR]
        )

        repo = InvestigationRepository(db_session)
        result = repo.get_user_role(user.id, inv.id)

        assert result is not None
        assert Role.EDITOR in result.roles

    def test_get_user_role_not_found(self, db_session):
        self._setup(db_session)
        repo = InvestigationRepository(db_session)
        result = repo.get_user_role(uuid4(), uuid4())
        assert result is None

    def test_add_user_role(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory()

        repo = InvestigationRepository(db_session)
        role_entry = InvestigationUserRole(
            id=uuid4(),
            user_id=user.id,
            investigation_id=inv.id,
            roles=[Role.OWNER],
        )
        repo.add_user_role(role_entry)
        db_session.commit()

        result = repo.get_user_role(user.id, inv.id)
        assert result is not None
        assert Role.OWNER in result.roles
