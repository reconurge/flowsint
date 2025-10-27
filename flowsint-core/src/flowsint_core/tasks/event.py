# tasks/logging.py
from typing import Dict
from ..core.celery import celery
import redis
import logging
import os
from ..core.enums import EventLevel
from ..core.types import Event

logger = logging.getLogger(__name__)


@celery.task(name="emit_event")
def emit_event_task(log_id: str, sketch_id: str, log_type: EventLevel, content: Dict):
    """Celery task to emit a log event"""
    try:
        event = Event(
            id=log_id, sketch_id=sketch_id, type=log_type, payload=content
        ).model_dump_json()
        redis_client = redis.from_url(os.environ["REDIS_URL"])
        redis_client.publish(sketch_id, event)
    except Exception as e:
        raise
