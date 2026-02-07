"""Tests for LogRepository."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from tests.factories import (
    InvestigationFactory,
    LogFactory,
    ProfileFactory,
    SketchFactory,
)
from flowsint_core.core.repositories import LogRepository


class TestLogRepository:
    def _setup(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        InvestigationFactory._meta.sqlalchemy_session = db_session
        SketchFactory._meta.sqlalchemy_session = db_session
        LogFactory._meta.sqlalchemy_session = db_session

    def test_get_by_sketch(self, db_session):
        self._setup(db_session)
        sketch = SketchFactory()
        LogFactory(sketch_id=sketch.id)
        LogFactory(sketch_id=sketch.id)

        repo = LogRepository(db_session)
        results = repo.get_by_sketch(sketch.id, since=datetime(2000, 1, 1))

        assert len(results) == 2

    def test_get_by_sketch_with_limit(self, db_session):
        self._setup(db_session)
        sketch = SketchFactory()
        for _ in range(5):
            LogFactory(sketch_id=sketch.id)

        repo = LogRepository(db_session)
        results = repo.get_by_sketch(sketch.id, limit=3, since=datetime(2000, 1, 1))

        assert len(results) == 3

    def test_delete_by_sketch(self, db_session):
        self._setup(db_session)
        sketch = SketchFactory()
        LogFactory(sketch_id=sketch.id)
        LogFactory(sketch_id=sketch.id)

        repo = LogRepository(db_session)
        count = repo.delete_by_sketch(sketch.id)
        db_session.commit()

        assert count == 2
        results = repo.get_by_sketch(sketch.id, since=datetime(2000, 1, 1))
        assert len(results) == 0

    def test_get_by_sketch_empty(self, db_session):
        self._setup(db_session)
        repo = LogRepository(db_session)
        results = repo.get_by_sketch(uuid4(), since=datetime(2000, 1, 1))
        assert len(results) == 0
