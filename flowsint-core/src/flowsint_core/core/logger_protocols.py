"""
Protocols and interfaces for the Logger system.
Following SOLID principles with Dependency Inversion.
"""
from typing import Protocol, Any, Dict
from uuid import UUID
from .models import Log
from .enums import EventLevel


class DatabaseSession(Protocol):
    """Protocol for database session operations."""

    def add(self, instance: Any) -> None:
        """Add an instance to the session."""
        ...

    def add_all(self, instances: list[Any]) -> None:
        """Add multiple instances to the session."""
        ...

    def commit(self) -> None:
        """Commit the current transaction."""
        ...

    def refresh(self, instance: Any) -> None:
        """Refresh an instance from the database."""
        ...

    def close(self) -> None:
        """Close the session."""
        ...


class EventEmitter(Protocol):
    """Protocol for event emission (Redis pub/sub)."""

    def emit(self, log_id: str, sketch_id: str, level: EventLevel, content: Dict) -> None:
        """Emit a log event to Redis for real-time display."""
        ...


class LogStorage(Protocol):
    """Protocol for log storage operations."""

    def store_log(self, sketch_id: str, level: EventLevel, content: Dict) -> Log:
        """Store a single log entry."""
        ...

    def store_logs_batch(self, logs_data: list[tuple[str, EventLevel, Dict]]) -> list[Log]:
        """Store multiple log entries in a batch."""
        ...
