"""Tests for event-task payload serialization."""

import json
from unittest.mock import MagicMock

from flowsint_core.core.enums import EventLevel
from flowsint_core.tasks import event


def test_emit_event_wraps_legacy_string_message(monkeypatch):
    """String messages must remain valid Event payloads."""
    redis_client = MagicMock()
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setattr(event.redis, "from_url", lambda _: redis_client)

    event.emit_event_task.run(
        "log-id",
        "sketch-id",
        EventLevel.FAILED,
        "enricher failed",
    )

    channel, serialized_event = redis_client.publish.call_args.args
    assert channel == "sketch-id"
    assert json.loads(serialized_event)["payload"] == {"message": "enricher failed"}
