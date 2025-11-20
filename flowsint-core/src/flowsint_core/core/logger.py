"""
Modern Logger implementation with Singleton pattern and batch insertion.

Architecture:
- Singleton: Thread-safe instance
- Immediate event emission: Real-time display in UI
- Batched database insertion: Performance optimization
- SOLID principles: Dependency injection via protocols
- Ordering: Monotonic sequence number + application timestamp
"""
from typing import Dict, Union, Optional, Tuple
from uuid import UUID
import threading
import time
import atexit
from queue import Queue
from datetime import datetime, timezone
from .enums import EventLevel
from .models import Log
from .postgre_db import get_db
from ..tasks.event import emit_event_task


class LoggerSingleton:
    """
    Thread-safe Singleton Logger with batched database insertion.

    Features:
    - Immediate event emission for real-time UI updates
    - Batched database writes for performance
    - Thread-safe operations
    - Automatic flush on shutdown
    """

    _instance: Optional['LoggerSingleton'] = None
    _lock = threading.Lock()

    def __new__(
        cls,
        batch_size: int = 50,
        flush_interval: float = 2.0,
        auto_start: bool = True
    ):
        """Thread-safe singleton implementation using double-checked locking."""
        if cls._instance is None:
            with cls._lock:
                # Double-check to prevent race condition
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(
        self,
        batch_size: int = 50,
        flush_interval: float = 2.0,
        auto_start: bool = True
    ):
        """
        Initialize the Logger singleton.

        Args:
            batch_size: Number of logs to batch before writing to DB
            flush_interval: Time in seconds between automatic flushes
            auto_start: Whether to start the batch worker automatically
        """
        # Only initialize once
        if self._initialized:
            return

        self._initialized = True
        self._batch_size = batch_size
        self._flush_interval = flush_interval

        # Queue for batch insertion (contains: sequence, timestamp, sketch_id, level, content)
        self._log_queue: Queue = Queue()

        # Monotonic sequence counter for ordering (thread-safe with lock)
        self._sequence_counter = 0
        self._sequence_lock = threading.Lock()

        # Worker thread for batch processing
        self._worker_thread: Optional[threading.Thread] = None
        self._shutdown_event = threading.Event()

        # Register cleanup on exit
        atexit.register(self.shutdown)

        if auto_start:
            self.start()

    def _get_next_sequence(self) -> int:
        """Get the next sequence number in a thread-safe manner."""
        with self._sequence_lock:
            self._sequence_counter += 1
            return self._sequence_counter

    def start(self) -> None:
        """Start the batch worker thread."""
        if self._worker_thread is None or not self._worker_thread.is_alive():
            self._shutdown_event.clear()
            self._worker_thread = threading.Thread(
                target=self._batch_worker,
                daemon=True,
                name="LoggerBatchWorker"
            )
            self._worker_thread.start()

    def shutdown(self) -> None:
        """Shutdown the logger and flush all pending logs."""
        self._shutdown_event.set()
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=5.0)
        # Final flush
        self._flush_batch(force=True)

    def _batch_worker(self) -> None:
        """Background worker that flushes logs periodically."""
        while not self._shutdown_event.is_set():
            time.sleep(self._flush_interval)
            self._flush_batch()

    def _flush_batch(self, force: bool = False) -> None:
        """
        Flush pending logs to database.

        Args:
            force: If True, flush all logs regardless of batch size
        """
        if self._log_queue.empty():
            return

        logs_to_insert = []

        # Collect logs from queue
        while not self._log_queue.empty() and (force or len(logs_to_insert) < self._batch_size):
            try:
                logs_to_insert.append(self._log_queue.get_nowait())
            except:
                break

        if not logs_to_insert:
            return

        # Sort logs by sequence number to maintain order
        logs_to_insert.sort(key=lambda x: x[0])  # x[0] is the sequence number

        # Batch insert to database
        try:
            db = next(get_db())
        except (StopIteration, RuntimeError) as e:
            # Generator exhausted or error getting DB - log to standard logging
            import logging
            logging.error(f"Failed to get database session: {e}")
            return

        try:
            log_objects = []
            for sequence, timestamp, sketch_id, level, content in logs_to_insert:
                log = Log(
                    sketch_id=str(sketch_id),
                    type=level.value,
                    content=content,
                    created_at=timestamp  # Use application-side timestamp
                )
                log_objects.append(log)

            db.add_all(log_objects)
            db.commit()

            # Refresh to get IDs (needed for event emission tracking)
            for log in log_objects:
                db.refresh(log)

        except Exception as e:
            db.rollback()
            # Log to standard logging as fallback
            import logging
            logging.error(f"Failed to batch insert logs: {e}")
        finally:
            db.close()

    def _emit_event(
        self,
        log_id: str,
        sketch_id: str,
        level: EventLevel,
        content: Dict
    ) -> None:
        """
        Emit event immediately for real-time display.

        Args:
            log_id: Log entry ID
            sketch_id: Sketch ID for event routing
            level: Log level
            content: Log content
        """
        try:
            emit_event_task.apply(
                args=[log_id, str(sketch_id), level, content]
            )
        except Exception as e:
            # Don't let event emission errors break logging
            import logging
            logging.error(f"Failed to emit event: {e}")

    def _log(
        self,
        sketch_id: Union[str, UUID],
        level: EventLevel,
        content: Dict
    ) -> None:
        """
        Internal logging method.

        Process:
        1. Capture timestamp and sequence number immediately
        2. Emit event immediately (real-time UI)
        3. Queue for batch insertion with ordering info (performance)

        Args:
            sketch_id: Sketch ID for log routing
            level: Log level
            content: Log content/message
        """
        # Capture timestamp and sequence at the time of logging (not insertion)
        sequence = self._get_next_sequence()
        timestamp = datetime.now(timezone.utc)

        # Generate a temporary ID for immediate event emission
        import uuid
        temp_log_id = str(uuid.uuid4())

        # 1. IMMEDIATE: Emit event for real-time display
        self._emit_event(temp_log_id, str(sketch_id), level, content)

        # 2. BATCHED: Queue for database insertion with ordering info
        # Format: (sequence, timestamp, sketch_id, level, content)
        self._log_queue.put((sequence, timestamp, str(sketch_id), level, content))

        # 3. Check if we should flush immediately (batch size reached)
        if self._log_queue.qsize() >= self._batch_size:
            self._flush_batch()

    # Public API methods

    def info(self, sketch_id: Union[str, UUID], message: Dict) -> None:
        """Log an info message."""
        self._log(sketch_id, EventLevel.INFO, message)

    def error(self, sketch_id: Union[str, UUID], message: Dict) -> None:
        """Log an error message."""
        self._log(sketch_id, EventLevel.FAILED, message)

    def warn(self, sketch_id: Union[str, UUID], message: Dict) -> None:
        """Log a warning message."""
        self._log(sketch_id, EventLevel.WARNING, message)

    def debug(self, sketch_id: Union[str, UUID], message: Dict) -> None:
        """Log a debug message."""
        self._log(sketch_id, EventLevel.DEBUG, message)

    def success(self, sketch_id: Union[str, UUID], message: Dict) -> None:
        """Log a success message."""
        self._log(sketch_id, EventLevel.SUCCESS, message)

    def completed(self, sketch_id: Union[str, UUID], message: Dict) -> None:
        """Log a completed message."""
        self._log(sketch_id, EventLevel.COMPLETED, message)

    def pending(self, sketch_id: Union[str, UUID], message: Dict) -> None:
        """Log a pending message."""
        self._log(sketch_id, EventLevel.PENDING, message)

    def graph_append(self, sketch_id: Union[str, UUID], message: Dict) -> None:
        """Log a graph append operation."""
        self._log(sketch_id, EventLevel.GRAPH_APPEND, message)

    def flush(self) -> None:
        """Manually flush all pending logs to database."""
        self._flush_batch(force=True)

    @property
    def queue_size(self) -> int:
        """Get current size of the log queue."""
        return self._log_queue.qsize()


# Global singleton instance
_logger = LoggerSingleton()


# Export the singleton instance as Logger
Logger = _logger
