from typing import Literal, Union, Any
from uuid import UUID

EventLevel = Literal["info", "warn", "error", "success", "debug"]

LEVEL_MAP = {
    "info": "INFO",
    "warn": "WARN",
    "error": "FAILED",
    "success": "SUCCESS",
    "debug": "DEBUG",
}


class TestLogger:
    @staticmethod
    def _format_message(type: str, message: str) -> str:
        """Format the log message with type prefix"""
        return f"[{type.upper()}] {message}"

    @staticmethod
    def _create_log(sketch_id: Union[str, UUID], log_type: str, content: str) -> Any:
        """Create a dummy log object for testing"""

        class DummyLog:
            def __init__(self):
                self.id = "dummy_id"

        return DummyLog()

    @staticmethod
    def info(sketch_id: Union[str, UUID], message: str):
        """Log an info message"""
        formatted_message = TestLogger._format_message("INFO", message)
        print(formatted_message)

    @staticmethod
    def error(sketch_id: Union[str, UUID], message: str):
        """Log an error message"""
        formatted_message = TestLogger._format_message("FAILED", message)
        print(formatted_message)

    @staticmethod
    def warn(sketch_id: Union[str, UUID], message: str):
        """Log a warning message"""
        formatted_message = TestLogger._format_message("WARNING", message)
        print(formatted_message)

    @staticmethod
    def debug(sketch_id: Union[str, UUID], message: str):
        """Log a debug message"""
        formatted_message = TestLogger._format_message("DEBUG", message)
        print(formatted_message)

    @staticmethod
    def success(sketch_id: Union[str, UUID], message: str):
        """Log a success message"""
        formatted_message = TestLogger._format_message("SUCCESS", message)
        print(formatted_message)
