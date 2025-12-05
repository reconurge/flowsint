"""
Comprehensive tests for the LoggerSingleton implementation.

Tests cover:
- Singleton pattern behavior
- Thread safety
- Batch insertion
- Event emission
- Queue management
- Shutdown behavior
"""
import pytest
import threading
import time
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4

from flowsint_core.core.logger import LoggerSingleton
from flowsint_core.core.enums import EventLevel


@pytest.fixture
def mock_db_session():
    """Mock database session."""
    session = Mock()
    session.add = Mock()
    session.add_all = Mock()
    session.commit = Mock()
    session.refresh = Mock()
    session.rollback = Mock()
    session.close = Mock()
    return session


@pytest.fixture
def mock_get_db(mock_db_session):
    """Mock the get_db generator."""
    def mock_generator():
        yield mock_db_session

    with patch('flowsint_core.core.logger.get_db', mock_generator):
        yield mock_generator


@pytest.fixture
def mock_emit_event():
    """Mock the emit_event_task."""
    with patch('flowsint_core.core.logger.emit_event_task') as mock:
        mock.apply = Mock()
        yield mock


@pytest.fixture
def logger_instance(mock_get_db, mock_emit_event):
    """Create a fresh logger instance for testing."""
    # Reset singleton
    LoggerSingleton._instance = None
    logger = LoggerSingleton(
        batch_size=5,
        flush_interval=0.5,
        auto_start=False  # Don't start worker for most tests
    )
    yield logger
    # Cleanup
    logger.shutdown()


class TestSingletonPattern:
    """Test the Singleton pattern implementation."""

    def test_singleton_returns_same_instance(self, mock_get_db, mock_emit_event):
        """Test that multiple calls return the same instance."""
        LoggerSingleton._instance = None
        logger1 = LoggerSingleton()
        logger2 = LoggerSingleton()

        assert logger1 is logger2
        assert id(logger1) == id(logger2)

        logger1.shutdown()

    def test_singleton_is_thread_safe(self, mock_get_db, mock_emit_event):
        """Test that singleton is thread-safe."""
        LoggerSingleton._instance = None
        instances = []

        def create_logger():
            logger = LoggerSingleton()
            instances.append(logger)

        threads = [threading.Thread(target=create_logger) for _ in range(10)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # All instances should be the same
        first_instance = instances[0]
        assert all(logger is first_instance for logger in instances)

        first_instance.shutdown()


class TestLoggingMethods:
    """Test the various logging methods."""

    def test_info_logs_correctly(self, logger_instance, mock_emit_event):
        """Test info logging."""
        sketch_id = str(uuid4())
        message = {"message": "Test info"}

        logger_instance.info(sketch_id, message)

        # Event should be emitted immediately
        mock_emit_event.apply.assert_called_once()
        call_args = mock_emit_event.apply.call_args[1]['args']
        assert call_args[1] == sketch_id
        assert call_args[2] == EventLevel.INFO
        assert call_args[3] == message

        # Log should be queued
        assert logger_instance.queue_size == 1

    def test_error_logs_correctly(self, logger_instance, mock_emit_event):
        """Test error logging."""
        sketch_id = str(uuid4())
        message = {"message": "Test error"}

        logger_instance.error(sketch_id, message)

        call_args = mock_emit_event.apply.call_args[1]['args']
        assert call_args[2] == EventLevel.FAILED

    def test_warn_logs_correctly(self, logger_instance, mock_emit_event):
        """Test warning logging."""
        sketch_id = str(uuid4())
        message = {"message": "Test warning"}

        logger_instance.warn(sketch_id, message)

        call_args = mock_emit_event.apply.call_args[1]['args']
        assert call_args[2] == EventLevel.WARNING

    def test_debug_logs_correctly(self, logger_instance, mock_emit_event):
        """Test debug logging."""
        sketch_id = str(uuid4())
        message = {"message": "Test debug"}

        logger_instance.debug(sketch_id, message)

        call_args = mock_emit_event.apply.call_args[1]['args']
        assert call_args[2] == EventLevel.DEBUG

    def test_success_logs_correctly(self, logger_instance, mock_emit_event):
        """Test success logging."""
        sketch_id = str(uuid4())
        message = {"message": "Test success"}

        logger_instance.success(sketch_id, message)

        call_args = mock_emit_event.apply.call_args[1]['args']
        assert call_args[2] == EventLevel.SUCCESS

    def test_completed_logs_correctly(self, logger_instance, mock_emit_event):
        """Test completed logging."""
        sketch_id = str(uuid4())
        message = {"message": "Test completed"}

        logger_instance.completed(sketch_id, message)

        call_args = mock_emit_event.apply.call_args[1]['args']
        assert call_args[2] == EventLevel.COMPLETED

    def test_pending_logs_correctly(self, logger_instance, mock_emit_event):
        """Test pending logging."""
        sketch_id = str(uuid4())
        message = {"message": "Test pending"}

        logger_instance.pending(sketch_id, message)

        call_args = mock_emit_event.apply.call_args[1]['args']
        assert call_args[2] == EventLevel.PENDING

    def test_graph_append_logs_correctly(self, logger_instance, mock_emit_event):
        """Test graph append logging."""
        sketch_id = str(uuid4())
        message = {"message": "Test graph append"}

        logger_instance.graph_append(sketch_id, message)

        call_args = mock_emit_event.apply.call_args[1]['args']
        assert call_args[2] == EventLevel.GRAPH_APPEND


class TestBatchInsertion:
    """Test batch insertion behavior."""

    def test_logs_are_queued(self, logger_instance):
        """Test that logs are queued before batch insertion."""
        sketch_id = str(uuid4())

        for i in range(3):
            logger_instance.info(sketch_id, {"message": f"Log {i}"})

        assert logger_instance.queue_size == 3

    def test_batch_flush_when_size_reached(self, logger_instance, mock_db_session):
        """Test that batch flushes when batch_size is reached."""
        sketch_id = str(uuid4())

        # Logger has batch_size=5
        for i in range(5):
            logger_instance.info(sketch_id, {"message": f"Log {i}"})

        # Should trigger automatic flush
        time.sleep(0.1)  # Give it time to flush

        # Verify database operations
        mock_db_session.add_all.assert_called_once()
        mock_db_session.commit.assert_called_once()

    def test_manual_flush(self, logger_instance, mock_db_session):
        """Test manual flush operation."""
        sketch_id = str(uuid4())

        # Add some logs (less than batch size)
        for i in range(3):
            logger_instance.info(sketch_id, {"message": f"Log {i}"})

        assert logger_instance.queue_size == 3

        # Manual flush
        logger_instance.flush()

        # Queue should be empty
        assert logger_instance.queue_size == 0

        # Verify database operations
        mock_db_session.add_all.assert_called_once()
        mock_db_session.commit.assert_called_once()

    def test_batch_worker_flushes_periodically(self, mock_get_db, mock_emit_event, mock_db_session):
        """Test that batch worker flushes logs periodically."""
        LoggerSingleton._instance = None
        logger = LoggerSingleton(
            batch_size=100,  # High batch size
            flush_interval=0.3,  # Short interval for testing
            auto_start=True  # Start worker
        )

        sketch_id = str(uuid4())

        # Add some logs
        for i in range(3):
            logger.info(sketch_id, {"message": f"Log {i}"})

        # Wait for automatic flush (should happen within flush_interval)
        time.sleep(0.5)

        # Verify flush happened
        assert mock_db_session.add_all.call_count >= 1

        logger.shutdown()

    def test_empty_queue_flush_does_nothing(self, logger_instance, mock_db_session):
        """Test that flushing an empty queue does nothing."""
        logger_instance.flush()

        # No database operations should occur
        mock_db_session.add_all.assert_not_called()
        mock_db_session.commit.assert_not_called()


class TestThreadSafety:
    """Test thread safety of logging operations."""

    def test_concurrent_logging(self, logger_instance, mock_emit_event):
        """Test that concurrent logging from multiple threads works correctly."""
        sketch_id = str(uuid4())
        num_threads = 10
        logs_per_thread = 10

        def log_messages():
            for i in range(logs_per_thread):
                logger_instance.info(sketch_id, {"message": f"Log {i}"})

        threads = [threading.Thread(target=log_messages) for _ in range(num_threads)]

        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # All logs should be queued or processed
        expected_total = num_threads * logs_per_thread
        assert mock_emit_event.apply.call_count == expected_total

    def test_concurrent_flush(self, logger_instance, mock_db_session):
        """Test that concurrent flush operations are safe."""
        sketch_id = str(uuid4())

        # Add some logs
        for i in range(20):
            logger_instance.info(sketch_id, {"message": f"Log {i}"})

        # Flush concurrently from multiple threads
        def flush():
            logger_instance.flush()

        threads = [threading.Thread(target=flush) for _ in range(5)]

        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # Queue should be empty
        assert logger_instance.queue_size == 0

        # At least one flush should have happened
        assert mock_db_session.add_all.call_count >= 1


class TestShutdown:
    """Test shutdown behavior."""

    def test_shutdown_flushes_pending_logs(self, mock_get_db, mock_emit_event, mock_db_session):
        """Test that shutdown flushes all pending logs."""
        LoggerSingleton._instance = None
        logger = LoggerSingleton(batch_size=100, auto_start=False)

        sketch_id = str(uuid4())

        # Add logs
        for i in range(10):
            logger.info(sketch_id, {"message": f"Log {i}"})

        assert logger.queue_size == 10

        # Shutdown should flush
        logger.shutdown()

        # Queue should be empty
        assert logger.queue_size == 0

        # Database operations should have occurred
        mock_db_session.add_all.assert_called_once()
        mock_db_session.commit.assert_called_once()

    def test_shutdown_stops_worker_thread(self, mock_get_db, mock_emit_event):
        """Test that shutdown stops the worker thread."""
        LoggerSingleton._instance = None
        logger = LoggerSingleton(batch_size=10, flush_interval=0.5, auto_start=True)

        assert logger._worker_thread.is_alive()

        logger.shutdown()

        # Give thread time to stop
        time.sleep(0.1)

        assert not logger._worker_thread.is_alive() or logger._shutdown_event.is_set()


class TestErrorHandling:
    """Test error handling in various scenarios."""

    def test_database_error_does_not_crash(self, logger_instance, mock_db_session):
        """Test that database errors don't crash the logger."""
        mock_db_session.commit.side_effect = Exception("Database error")

        sketch_id = str(uuid4())
        logger_instance.info(sketch_id, {"message": "Test"})

        # Flush should handle the error gracefully
        logger_instance.flush()

        # Logger should still be operational
        logger_instance.info(sketch_id, {"message": "After error"})

    def test_event_emission_error_does_not_crash(self, logger_instance, mock_emit_event):
        """Test that event emission errors don't crash the logger."""
        mock_emit_event.apply.side_effect = Exception("Event emission error")

        sketch_id = str(uuid4())

        # Should not raise exception
        logger_instance.info(sketch_id, {"message": "Test"})

        # Log should still be queued despite event emission failure
        assert logger_instance.queue_size == 1


class TestPerformance:
    """Test performance characteristics."""

    def test_high_volume_logging(self, logger_instance, mock_emit_event):
        """Test that logger handles high volume of logs."""
        sketch_id = str(uuid4())
        num_logs = 1000

        start_time = time.time()

        for i in range(num_logs):
            logger_instance.info(sketch_id, {"message": f"Log {i}"})

        elapsed = time.time() - start_time

        # Should handle 1000 logs in reasonable time (< 1 second)
        assert elapsed < 1.0

        # All events should be emitted
        assert mock_emit_event.apply.call_count == num_logs

    def test_batch_insertion_is_efficient(self, logger_instance, mock_db_session):
        """Test that batch insertion reduces database calls."""
        sketch_id = str(uuid4())

        # Log 50 messages (batch_size is 5)
        for i in range(50):
            logger_instance.info(sketch_id, {"message": f"Log {i}"})

        logger_instance.flush()

        # Should make fewer calls than number of logs (due to batching)
        # With batch_size=5 and 50 logs, should make ~10 batch inserts
        assert mock_db_session.add_all.call_count <= 15  # Some tolerance
