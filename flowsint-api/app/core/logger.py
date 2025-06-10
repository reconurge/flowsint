from uuid import UUID
from typing import Literal, Union
from app.models.models import Log
from app.tasks.logging import emit_log_task
from app.core.postgre_db import get_db
import logging

logger = logging.getLogger(__name__)

LogLevel = Literal["info", "warn", "error", "success", "debug"]

LEVEL_MAP = {
    "info": "INFO",
    "warn": "WARN",
    "error": "ERROR",
    "success": "SUCCESS",
    "debug": "DEBUG",
}


class Logger:
    @staticmethod
    def _create_log(sketch_id: Union[str, UUID], type: str, content: str) -> Log:
        """Create a log entry in the database"""
        db = next(get_db())
        try:
            log = Log(
                sketch_id=str(sketch_id),
                type=type,
                content=content
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            return log
        finally:
            db.close()

    @staticmethod
    def _format_message(type: str, message: str) -> str:
        """Format the log message with type prefix"""
        return f"[{type.upper()}] {message}"

    @staticmethod
    def info(sketch_id: Union[str, UUID], message: str):
        """Log an info message"""
        formatted_message = Logger._format_message("INFO", message)
        logger.info(formatted_message)
        log = Logger._create_log(sketch_id, "INFO", formatted_message)
        emit_log_task.delay(str(log.id), str(sketch_id), "INFO", formatted_message)

    @staticmethod
    def error(sketch_id: Union[str, UUID], message: str):
        """Log an error message"""
        formatted_message = Logger._format_message("ERROR", message)
        logger.error(formatted_message)
        log = Logger._create_log(sketch_id, "ERROR", formatted_message)
        emit_log_task.delay(str(log.id), str(sketch_id), "ERROR", formatted_message)

    @staticmethod
    def warn(sketch_id: Union[str, UUID], message: str):
        """Log a warning message"""
        formatted_message = Logger._format_message("WARNING", message)
        logger.warn(formatted_message)
        log = Logger._create_log(sketch_id, "WARNING", formatted_message)
        emit_log_task.delay(str(log.id), str(sketch_id), "WARNING", formatted_message)

    @staticmethod
    def debug(sketch_id: Union[str, UUID], message: str):
        """Log a debug message"""
        formatted_message = Logger._format_message("DEBUG", message)
        logger.debug(formatted_message)
        log = Logger._create_log(sketch_id, "DEBUG", formatted_message)
        emit_log_task.delay(str(log.id), str(sketch_id), "DEBUG", formatted_message)

    @staticmethod
    def success(sketch_id: Union[str, UUID], message: str):
        """Log a success message"""
        formatted_message = Logger._format_message("SUCCESS", message)
        logger.info(formatted_message)
        log = Logger._create_log(sketch_id, "SUCCESS", formatted_message)
        emit_log_task.delay(str(log.id), str(sketch_id), "SUCCESS", formatted_message)
