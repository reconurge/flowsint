from typing import Literal

LogLevel = Literal["info", "warn", "error", "success", "debug"]

LEVEL_MAP = {
    "info": "INFO",
    "warn": "WARN", 
    "error": "ERROR",
    "success": "SUCCESS",
    "debug": "DEBUG",
}


class TestLogger:
    def __init__(self):
        pass

    def _format_message(self, type: str, message: str) -> str:
        """Format the log message with type prefix"""
        return f"[{type.upper()}] {message}"

    def info(self, message: str):
        """Log an info message"""
        formatted_message = self._format_message("INFO", message)
        print(formatted_message)

    def error(self, message: str):
        """Log an error message"""
        formatted_message = self._format_message("ERROR", message)
        print(formatted_message)

    def warn(self, message: str):
        """Log a warning message"""
        formatted_message = self._format_message("WARNING", message)
        print(formatted_message)

    def debug(self, message: str):
        """Log a debug message"""
        formatted_message = self._format_message("DEBUG", message)
        print(formatted_message)

    def success(self, message: str):
        """Log a success message"""
        formatted_message = self._format_message("SUCCESS", message)
        print(formatted_message)
