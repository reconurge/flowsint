import pytest
from tests.logger import TestLogger

@pytest.fixture(autouse=True)
def mock_logger(monkeypatch):
    """Automatically replace the production Logger with TestLogger for all tests."""
    monkeypatch.setattr("app.core.logger.Logger", TestLogger)
    # Mock the emit_event_task to do nothing
    monkeypatch.setattr("app.core.logger.emit_event_task.delay", lambda *args, **kwargs: None) 