from uuid import UUID
from sqlalchemy.orm import Session
from typing import Literal, Optional, Union
from datetime import datetime
from app.models.models import Log
from app.core.events import event_emitter, GLOBAL_STREAM
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
    def __init__(self, scan_id: Optional[Union[str, UUID]] = None, sketch_id: Optional[Union[str, UUID]] = None):
        self.scan_id = str(scan_id) if scan_id and not isinstance(scan_id, Session) else None
        self.sketch_id = str(sketch_id) if sketch_id and not isinstance(sketch_id, Session) else None
        self.db = next(get_db())
        logger.debug(f"Logger initialized for scan_id: {scan_id}, sketch_id: {sketch_id}")

    def _create_log(self, type: str, content: str) -> Log:
        """Create a log entry in the database"""
        log = Log(
            scan_id=self.scan_id,
            sketch_id=self.sketch_id,
            type=type,
            content=content
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def _format_message(self, type: str, message: str) -> str:
        """Format the log message with type prefix"""
        return f"[{type.upper()}] {message}"

    def info(self, message: str):
        """Log an info message"""
        formatted_message = self._format_message("INFO", message)
        logger.info(formatted_message)
        log = self._create_log("INFO", formatted_message)
        emit_log_task.delay(str(log.id), self.scan_id, "INFO", formatted_message)

    def error(self, message: str):
        """Log an error message"""
        formatted_message = self._format_message("ERROR", message)
        logger.error(formatted_message)
        log = self._create_log("ERROR", formatted_message)
        emit_log_task.delay(str(log.id), self.scan_id, "ERROR", formatted_message)

    def warn(self, message: str):
        """Log a warning message"""
        formatted_message = self._format_message("WARNING", message)
        logger.warn(formatted_message)
        log = self._create_log("WARNING", formatted_message)
        emit_log_task.delay(str(log.id), self.scan_id, "WARNING", formatted_message)

    def debug(self, message: str):
        """Log a debug message"""
        formatted_message = self._format_message("DEBUG", message)
        logger.debug(formatted_message)
        log = self._create_log("DEBUG", formatted_message)
        emit_log_task.delay(str(log.id), self.scan_id, "DEBUG", formatted_message)

    def success(self, message: str):
        """Log a success message"""
        formatted_message = self._format_message("SUCCESS", message)
        logger.info(formatted_message)
        log = self._create_log("SUCCESS", formatted_message)
        emit_log_task.delay(str(log.id), self.scan_id, "SUCCESS", formatted_message)

    def __del__(self):
        """Clean up database connection"""
        if hasattr(self, 'db'):
            self.db.close()
