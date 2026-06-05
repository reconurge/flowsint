"""Pytest configuration for flowsint-core tests."""

import os
from unittest.mock import MagicMock

import pytest

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from flowsint_core.core.models import Base


@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Set up test environment variables."""
    # Set a test master key for vault tests
    test_key = "base64:qnHTmwYb+uoygIw9MsRMY22vS5YPchY+QOi/E79GAvM="
    monkeypatch.setenv("MASTER_VAULT_KEY_V1", test_key)
    # Dummy Neo4j credentials: the Neo4jConnection singleton requires them
    # at construction, but driver creation is lazy — nothing connects.
    # Without these, tests silently depend on the developer's local .env.
    monkeypatch.setenv("NEO4J_URI_BOLT", "bolt://127.0.0.1:7687")
    monkeypatch.setenv("NEO4J_USERNAME", "neo4j")
    monkeypatch.setenv("NEO4J_PASSWORD", "test-password")


@pytest.fixture(autouse=True)
def mock_logger(monkeypatch):
    """Mock the Logger to avoid database calls during tests."""
    mock = MagicMock()
    monkeypatch.setattr("flowsint_core.core.logger.Logger", mock)
    return mock


@pytest.fixture
def db_session():
    """Create an in-memory SQLite session for testing."""
    engine = create_engine("sqlite:///:memory:")

    # Enable foreign key support for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
