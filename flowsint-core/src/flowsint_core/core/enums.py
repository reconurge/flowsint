from enum import Enum


class EventLevel(str, Enum):
    # Standard log levels
    INFO = "INFO"
    WARNING = "WARNING"
    FAILED = "FAILED"
    SUCCESS = "SUCCESS"
    DEBUG = "DEBUG"
    # Transform-specific statuses
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    GRAPH_APPEND = "GRAPH_APPEND"

    @classmethod
    def from_lowercase(cls, value: str) -> "EventLevel":
        """Convert a lowercase string to the corresponding EventLevel enum value"""
        return cls[value.upper()]

    @property
    def lowercase(self) -> str:
        """Get the lowercase version of the enum value"""
        return self.value.lower()
