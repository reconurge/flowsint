# tasks/logging.py
import logging
import os
from typing import Dict

import redis
from dotenv import load_dotenv

from ..core.celery import celery
from ..core.enums import EventLevel
from ..core.types import Event

load_dotenv()

logger = logging.getLogger(__name__)

_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


@celery.task(name="emit_event")
def emit_event_task(log_id: str, sketch_id: str, log_type: EventLevel, content: Dict):
    """Celery task to emit a log event"""
    try:
        event = Event(
            id=log_id, sketch_id=sketch_id, type=log_type, payload=content
        ).model_dump_json()
        redis_client = redis.from_url(_REDIS_URL)
        redis_client.publish(sketch_id, event)
    except Exception as e:
        raise


@celery.task(name="emit_status_event")
def emit_status_event_task(
    log_id: str, sketch_id: str, log_type: EventLevel, content: Dict
):
    """Celery task to emit a status event (COMPLETED) to status channel"""
    try:
        event = Event(
            id=log_id, sketch_id=sketch_id, type=log_type, payload=content
        ).model_dump_json()
        redis_client = redis.from_url(_REDIS_URL)
        redis_client.publish(f"{sketch_id}_status", event)
    except Exception as e:
        raise
