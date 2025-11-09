"""Utilities for sketch operations, including automatic timestamp updates."""

from functools import wraps
from datetime import datetime
from typing import Callable
from uuid import UUID
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session
from flowsint_core.core.models import Sketch, Investigation


def update_sketch_last_modified(db: Session, sketch_id: str | UUID) -> None:
    """
    Update the last_updated_at timestamp for a sketch and its parent investigation.

    This function is designed to be run as a background task to avoid
    blocking the response. It updates both the sketch's and its parent
    investigation's last_updated_at fields to the current time.

    Args:
        db: SQLAlchemy database session
        sketch_id: The ID of the sketch to update
    """
    try:
        sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
        if sketch:
            current_time = datetime.now()

            # Update sketch timestamp
            sketch.last_updated_at = current_time

            # Update parent investigation timestamp if it exists
            if sketch.investigation_id:
                investigation = db.query(Investigation).filter(
                    Investigation.id == sketch.investigation_id
                ).first()
                if investigation:
                    investigation.last_updated_at = current_time

            db.commit()
    except Exception as e:
        # Log error but don't raise to avoid disrupting background task
        print(f"Error updating sketch/investigation timestamp for {sketch_id}: {e}")
        db.rollback()


def update_sketch_timestamp(func: Callable) -> Callable:
    """
    Decorator to automatically update sketch's last_updated_at timestamp.

    This decorator:
    1. Extracts the sketch_id from route parameters
    2. Schedules a background task to update last_updated_at
    3. Returns the response immediately (non-blocking)

    Usage:
        @router.post("/{sketch_id}/nodes/add")
        @update_sketch_timestamp
        def add_node(
            sketch_id: str,
            node: NodeInput,
            background_tasks: BackgroundTasks,
            db: Session = Depends(get_db),
            ...
        ):
            # Your route logic here
            pass

    Requirements:
        - Route must have a 'sketch_id' parameter (path or query)
        - Route must have 'background_tasks: BackgroundTasks' parameter
        - Route must have 'db: Session' parameter
    """
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        # Extract required dependencies from kwargs
        sketch_id = kwargs.get("sketch_id")
        background_tasks: BackgroundTasks = kwargs.get("background_tasks")
        db: Session = kwargs.get("db")

        if not sketch_id:
            raise ValueError("sketch_id parameter is required for @update_sketch_timestamp")
        if not background_tasks:
            raise ValueError("background_tasks parameter is required for @update_sketch_timestamp")
        if not db:
            raise ValueError("db parameter is required for @update_sketch_timestamp")

        # Schedule the timestamp update as a background task
        background_tasks.add_task(update_sketch_last_modified, db, sketch_id)

        # Execute the original route function
        return await func(*args, **kwargs)

    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        # Extract required dependencies from kwargs
        sketch_id = kwargs.get("sketch_id")
        background_tasks: BackgroundTasks = kwargs.get("background_tasks")
        db: Session = kwargs.get("db")

        if not sketch_id:
            raise ValueError("sketch_id parameter is required for @update_sketch_timestamp")
        if not background_tasks:
            raise ValueError("background_tasks parameter is required for @update_sketch_timestamp")
        if not db:
            raise ValueError("db parameter is required for @update_sketch_timestamp")

        # Schedule the timestamp update as a background task
        background_tasks.add_task(update_sketch_last_modified, db, sketch_id)

        # Execute the original route function
        return func(*args, **kwargs)

    # Return the appropriate wrapper based on whether the function is async
    import inspect
    if inspect.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper
