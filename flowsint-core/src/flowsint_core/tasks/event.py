# tasks/logging.py
import logging
import os
from collections.abc import Mapping
from typing import Any

import redis

from ..core.celery import celery
from ..core.enums import EventLevel
from ..core.types import Event

logger = logging.getLogger(__name__)


def _event_payload(content: Any) -> dict[str, Any]:
    """Convert legacy string messages into the event payload schema."""
    if isinstance(content, Mapping):
        return dict(content)
    return {"message": str(content)}


@celery.task(name="emit_event")
def emit_event_task(log_id: str, sketch_id: str, log_type: EventLevel, content: Any):
    """Celery task to emit a log event."""
    event = Event(
        id=log_id,
        sketch_id=sketch_id,
        type=log_type,
        payload=_event_payload(content),
    ).model_dump_json()
    redis_client = redis.from_url(os.environ["REDIS_URL"])
    redis_client.publish(sketch_id, event)


@celery.task(name="emit_status_event")
def emit_status_event_task(
    log_id: str, sketch_id: str, log_type: EventLevel, content: Any
):
    """Celery task to emit a status event (COMPLETED) to status channel."""
    event = Event(
        id=log_id,
        sketch_id=sketch_id,
        type=log_type,
        payload=_event_payload(content),
    ).model_dump_json()
    redis_client = redis.from_url(os.environ["REDIS_URL"])
    redis_client.publish(f"{sketch_id}_status", event)
