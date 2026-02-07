"""Tests for ScanRepository."""
from tests.factories import (
    InvestigationFactory,
    InvestigationUserRoleFactory,
    ProfileFactory,
    ScanFactory,
    SketchFactory,
)
from flowsint_core.core.repositories import ScanRepository
from flowsint_core.core.types import Role


class TestScanRepository:
    def _setup(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        InvestigationFactory._meta.sqlalchemy_session = db_session
        InvestigationUserRoleFactory._meta.sqlalchemy_session = db_session
        SketchFactory._meta.sqlalchemy_session = db_session
        ScanFactory._meta.sqlalchemy_session = db_session

    def test_get_by_id(self, db_session):
        self._setup(db_session)
        scan = ScanFactory()

        repo = ScanRepository(db_session)
        result = repo.get_by_id(scan.id)

        assert result is not None

    def test_get_accessible_by_user(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        InvestigationUserRoleFactory(
            user=user, investigation=inv, roles=[Role.OWNER]
        )
        sketch = SketchFactory(investigation=inv, owner_id=user.id)
        ScanFactory(sketch=sketch)

        # Another user's scan
        other = ProfileFactory()
        other_inv = InvestigationFactory(owner=other)
        InvestigationUserRoleFactory(
            user=other, investigation=other_inv, roles=[Role.OWNER]
        )
        other_sketch = SketchFactory(investigation=other_inv, owner_id=other.id)
        ScanFactory(sketch=other_sketch)

        repo = ScanRepository(db_session)
        results = repo.get_accessible_by_user(user.id)

        assert len(results) == 1

    def test_delete(self, db_session):
        self._setup(db_session)
        scan = ScanFactory()

        repo = ScanRepository(db_session)
        repo.delete(scan)
        db_session.commit()

        assert repo.get_by_id(scan.id) is None
