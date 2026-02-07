"""Tests for SketchRepository."""
from uuid import uuid4

from tests.factories import InvestigationFactory, ProfileFactory, SketchFactory
from flowsint_core.core.repositories import SketchRepository


class TestSketchRepository:
    def _setup(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        InvestigationFactory._meta.sqlalchemy_session = db_session
        SketchFactory._meta.sqlalchemy_session = db_session

    def test_get_by_id(self, db_session):
        self._setup(db_session)
        sketch = SketchFactory()

        repo = SketchRepository(db_session)
        result = repo.get_by_id(sketch.id)

        assert result is not None
        assert result.title == sketch.title

    def test_get_by_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        SketchFactory(investigation=inv, owner_id=user.id)
        SketchFactory(investigation=inv, owner_id=user.id)

        # Different user's sketch
        other = ProfileFactory()
        other_inv = InvestigationFactory(owner=other)
        SketchFactory(investigation=other_inv, owner_id=other.id)

        repo = SketchRepository(db_session)
        results = repo.get_by_owner(user.id)

        assert len(results) == 2

    def test_get_by_investigation(self, db_session):
        self._setup(db_session)
        inv = InvestigationFactory()
        SketchFactory(investigation=inv)
        SketchFactory(investigation=inv)

        other_inv = InvestigationFactory()
        SketchFactory(investigation=other_inv)

        repo = SketchRepository(db_session)
        results = repo.get_by_investigation(inv.id)

        assert len(results) == 2

    def test_add_and_delete(self, db_session):
        self._setup(db_session)
        sketch = SketchFactory()

        repo = SketchRepository(db_session)
        repo.delete(sketch)
        db_session.commit()

        assert repo.get_by_id(sketch.id) is None
