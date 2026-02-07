"""Tests for AnalysisRepository."""
from uuid import uuid4

from tests.factories import (
    AnalysisFactory,
    InvestigationFactory,
    InvestigationUserRoleFactory,
    ProfileFactory,
)
from flowsint_core.core.repositories import AnalysisRepository
from flowsint_core.core.types import Role


class TestAnalysisRepository:
    def _setup(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        InvestigationFactory._meta.sqlalchemy_session = db_session
        InvestigationUserRoleFactory._meta.sqlalchemy_session = db_session
        AnalysisFactory._meta.sqlalchemy_session = db_session

    def test_get_by_id(self, db_session):
        self._setup(db_session)
        analysis = AnalysisFactory()

        repo = AnalysisRepository(db_session)
        result = repo.get_by_id(analysis.id)

        assert result is not None
        assert result.title == analysis.title

    def test_get_accessible_by_user(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        InvestigationUserRoleFactory(
            user=user, investigation=inv, roles=[Role.OWNER]
        )
        AnalysisFactory(investigation=inv, owner_id=user.id)

        # Another user's investigation — should not be accessible
        other = ProfileFactory()
        other_inv = InvestigationFactory(owner=other)
        InvestigationUserRoleFactory(
            user=other, investigation=other_inv, roles=[Role.OWNER]
        )
        AnalysisFactory(investigation=other_inv, owner_id=other.id)

        repo = AnalysisRepository(db_session)
        results = repo.get_accessible_by_user(user.id)

        assert len(results) == 1

    def test_get_by_investigation(self, db_session):
        self._setup(db_session)
        inv = InvestigationFactory()
        AnalysisFactory(investigation=inv)
        AnalysisFactory(investigation=inv)

        other_inv = InvestigationFactory()
        AnalysisFactory(investigation=other_inv)

        repo = AnalysisRepository(db_session)
        results = repo.get_by_investigation(inv.id)

        assert len(results) == 2

    def test_get_by_id_and_permission(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        analysis = AnalysisFactory(investigation=inv, owner_id=user.id)

        repo = AnalysisRepository(db_session)
        result = repo.get_by_id_and_permission(analysis.id, user.id)

        assert result is not None
        assert result.id == analysis.id

    def test_add_and_delete(self, db_session):
        self._setup(db_session)
        analysis = AnalysisFactory()

        repo = AnalysisRepository(db_session)
        repo.delete(analysis)
        db_session.commit()

        assert repo.get_by_id(analysis.id) is None
