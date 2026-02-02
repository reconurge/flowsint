"""Pytest configuration for template tests."""

from unittest.mock import MagicMock

import pytest


@pytest.fixture(autouse=True)
def mock_graph_service(monkeypatch):
    """Mock the graph service to avoid Neo4j calls during tests."""
    mock = MagicMock()
    monkeypatch.setattr(
        "flowsint_core.core.enricher_base.create_graph_service",
        lambda **kwargs: mock,
    )
    return mock
