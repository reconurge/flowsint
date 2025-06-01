# tasks/logging.py
from app.core.celery import celery
from app.core.events import event_emitter
import logging

logger = logging.getLogger(__name__)

@celery.task(name="emit_log")
def emit_log_task(log_id: str, scan_id: str, log_type: str, content: str):
    """Celery task to emit a log event"""
    try:
        logger.debug(f"Emitting log event: {log_id} for scan {scan_id}")
        log_data = {
            "id": log_id,
            "scan_id": scan_id,
            "type": log_type,
            "content": content
        }
        event_emitter.emit_sync(scan_id, log_data)
        logger.debug(f"Successfully emitted log event: {log_id}")
    except Exception as e:
        logger.error(f"Error emitting log event: {str(e)}")
        raise
