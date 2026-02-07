"""Tests for FlowRepository."""
from tests.factories import FlowFactory
from flowsint_core.core.repositories import FlowRepository


class TestFlowRepository:
    def _setup(self, db_session):
        FlowFactory._meta.sqlalchemy_session = db_session

    def test_get_by_id(self, db_session):
        self._setup(db_session)
        flow = FlowFactory()

        repo = FlowRepository(db_session)
        result = repo.get_by_id(flow.id)

        assert result is not None
        assert result.name == flow.name

    def test_get_all(self, db_session):
        self._setup(db_session)
        FlowFactory()
        FlowFactory()

        repo = FlowRepository(db_session)
        results = repo.get_all()

        assert len(results) == 2

    def test_get_all_with_no_category(self, db_session):
        self._setup(db_session)
        FlowFactory(category=["network"])
        FlowFactory(category=["osint"])

        repo = FlowRepository(db_session)
        results = repo.get_all_with_optional_category(None)

        assert len(results) == 2

    def test_get_all_with_category_filter(self, db_session):
        self._setup(db_session)
        FlowFactory(category=["network"])
        FlowFactory(category=["osint"])
        FlowFactory(category=["network", "osint"])

        repo = FlowRepository(db_session)
        results = repo.get_all_with_optional_category("network")

        assert len(results) == 2

    def test_get_all_with_category_case_insensitive(self, db_session):
        self._setup(db_session)
        FlowFactory(category=["Network"])

        repo = FlowRepository(db_session)
        results = repo.get_all_with_optional_category("network")

        assert len(results) == 1

    def test_delete(self, db_session):
        self._setup(db_session)
        flow = FlowFactory()

        repo = FlowRepository(db_session)
        repo.delete(flow)
        db_session.commit()

        assert repo.get_by_id(flow.id) is None
