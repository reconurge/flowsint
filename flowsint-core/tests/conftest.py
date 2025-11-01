"""Pytest configuration for flowsint-core tests."""
import pytest
import os


@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Set up test environment variables."""
    # Set a test master key for vault tests
    test_key = "base64:qnHTmwYb+uoygIw9MsRMY22vS5YPchY+QOi/E79GAvM="
    monkeypatch.setenv("MASTER_VAULT_KEY_V1", test_key)


@pytest.fixture(autouse=True)
def mock_logger(monkeypatch):
    """Mock the Logger to avoid database calls during tests."""
    from unittest.mock import MagicMock

    mock = MagicMock()
    monkeypatch.setattr("flowsint_core.core.logger.Logger", mock)
    return mock
