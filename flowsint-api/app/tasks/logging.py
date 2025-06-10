# tasks/logging.py
from app.core.celery import celery
import redis
import json
import logging
import os

logger = logging.getLogger(__name__)

@celery.task(name="emit_log")
def emit_log_task(log_id: str, sketch_id: str, log_type: str, content: str):
    """Celery task to emit a log event"""
    try:
        logger.debug(f"Emitting log event: {log_id} for sketch {sketch_id}")
        log_data = {
            "id": log_id,
            "sketch_id": sketch_id,
            "type": log_type,
            "content": content
        }
        print('########################################################')
        print(f"[EventEmitter] Publishing log event: {log_id} for sketch {sketch_id}")
        print('########################################################')

        # Connect to Redis and publish directly
        redis_client = redis.from_url(os.getenv("REDIS_URI", "redis://127.0.0.1:6379/0"))
        redis_client.publish(sketch_id, json.dumps(log_data))
        logger.debug(f"Successfully published log event: {log_id}")
    except Exception as e:
        logger.error(f"Error publishing log event: {str(e)}")
        raise
