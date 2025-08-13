from uuid import UUID
from typing import Any, Dict, Union
from .models import Log
from ..tasks.event import emit_event_task
from .postgre_db import get_db
from .enums import EventLevel
import logging

logger = logging.getLogger(__name__)


class Logger:
    @staticmethod
    def _create_log(
        sketch_id: Union[str, UUID], level: EventLevel, content: str
    ) -> Log:
        """Create a log entry in the database"""
        db = next(get_db())
        try:
            log = Log(sketch_id=str(sketch_id), type=level.value, content=content)
            db.add(log)
            db.commit()
            db.refresh(log)
            return log
        finally:
            db.close()

    @staticmethod
    def info(sketch_id: Union[str, UUID], message: Dict):
        """Log an info message"""
        log = Logger._create_log(sketch_id, EventLevel.INFO, message)
        emit_event_task.apply(
            args=[str(log.id), str(sketch_id), EventLevel.INFO, message]
        )

    @staticmethod
    def error(sketch_id: Union[str, UUID], message: Dict):
        """Log an error message"""
        log = Logger._create_log(sketch_id, EventLevel.FAILED, message)
        emit_event_task.apply(
            args=[str(log.id), str(sketch_id), EventLevel.FAILED, message]
        )

    @staticmethod
    def warn(sketch_id: Union[str, UUID], message: Dict):
        """Log a warning message"""
        log = Logger._create_log(sketch_id, EventLevel.WARNING, message)
        emit_event_task.apply(
            args=[str(log.id), str(sketch_id), EventLevel.WARNING, message]
        )

    @staticmethod
    def debug(sketch_id: Union[str, UUID], message: Dict):
        """Log a debug message"""
        log = Logger._create_log(sketch_id, EventLevel.DEBUG, message)
        emit_event_task.apply(
            args=[str(log.id), str(sketch_id), EventLevel.DEBUG, message]
        )

    @staticmethod
    def graph_append(sketch_id: Union[str, UUID], message: Dict):
        """Log an insert event to the graph"""
        log = Logger._create_log(sketch_id, EventLevel.GRAPH_APPEND, message)
        emit_event_task.apply(
            args=[str(log.id), str(sketch_id), EventLevel.GRAPH_APPEND, message]
        )

    @staticmethod
    def success(sketch_id: Union[str, UUID], message: Dict):
        """Log a success message"""
        log = Logger._create_log(sketch_id, EventLevel.SUCCESS, message)
        emit_event_task.apply(
            args=[str(log.id), str(sketch_id), EventLevel.SUCCESS, message]
        )

    @staticmethod
    def completed(sketch_id: Union[str, UUID], message: Dict):
        """Log a completed message"""
        log = Logger._create_log(sketch_id, EventLevel.COMPLETED, message)
        emit_event_task.apply(
            args=[str(log.id), str(sketch_id), EventLevel.COMPLETED, message]
        )

    @staticmethod
    def pending(sketch_id: Union[str, UUID], message: Dict):
        """Log a pending message"""
        log = Logger._create_log(sketch_id, EventLevel.PENDING, message)
        emit_event_task.apply(
            args=[str(log.id), str(sketch_id), EventLevel.PENDING, message]
        )
