import pytest
from tests.logger import TestLogger


@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Set up test environment variables.

    Dummy Neo4j credentials: the Neo4jConnection singleton requires them
    at construction, but driver creation is lazy — nothing connects.
    Without these, tests silently depend on the developer's local .env.
    """
    monkeypatch.setenv("NEO4J_URI_BOLT", "bolt://127.0.0.1:7687")
    monkeypatch.setenv("NEO4J_USERNAME", "neo4j")
    monkeypatch.setenv("NEO4J_PASSWORD", "test-password")


@pytest.fixture(autouse=True)
def mock_logger(monkeypatch):
    """Automatically replace the production Logger with TestLogger for all tests."""
    monkeypatch.setattr("flowsint_core.core.logger.Logger", TestLogger)
    # Mock the emit_event_task to do nothing
    monkeypatch.setattr(
        "flowsint_core.core.logger.emit_event_task.delay", lambda *args, **kwargs: None
    )
