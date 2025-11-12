from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import Log, Sketch
from flowsint_core.core.events import event_emitter
from sse_starlette.sse import EventSourceResponse
from flowsint_core.core.types import Event
from app.api.deps import get_current_user
from flowsint_core.core.models import Profile, Sketch
import json
import asyncio
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/sketch/{sketch_id}/logs")
def get_logs_by_sketch(
    sketch_id: str,
    limit: int = 100,
    since: datetime | None = None,
    db: Session = Depends(get_db),
    # current_user: Profile = Depends(get_current_user)
):
    """Get historical logs for a specific sketch with optional filtering"""
    # Check if sketch exists
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(
            status_code=404, detail=f"Sketch with id {sketch_id} not found"
        )

    print(
        f"[EventEmitter] Fetching logs for sketch {sketch_id} (limit: {limit}, since: {since})"
    )
    query = (
        db.query(Log).filter(Log.sketch_id == sketch_id).order_by(Log.created_at.desc())
    )

    if since:
        query = query.filter(Log.created_at > since)
    else:
        # Default to last 24 hours if no since parameter
        query = query.filter(Log.created_at > datetime.utcnow() - timedelta(days=1))

    logs = query.limit(limit).all()

    # Reverse to show chronologically (oldest to newest)
    logs = list(reversed(logs))

    results = []
    for log in logs:
        # Ensure payload is always a dictionary
        if isinstance(log.content, dict):
            payload = log.content
        elif isinstance(log.content, str):
            payload = {"message": log.content}
        elif log.content is None:
            payload = {}
        else:
            # Handle other types by converting to string and wrapping
            payload = {"content": str(log.content)}

        results.append(
            Event(
                id=str(log.id),
                sketch_id=str(log.sketch_id) if log.sketch_id else None,
                type=log.type,
                payload=payload,
                created_at=log.created_at
            )
        )

    return results


@router.get("/sketch/{sketch_id}/stream")
async def stream_events(
    request: Request,
    sketch_id: str,
    db: Session = Depends(get_db),
    #   current_user: Profile = Depends(get_current_user)
):
    """Stream events for a specific scan in real-time"""

    # Check if sketch exists
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(
            status_code=404, detail=f"Sketch with id {sketch_id} not found"
        )

    async def event_generator():
        channel = sketch_id
        await event_emitter.subscribe(channel)
        try:
            # Initial connection message
            yield 'data: {"event": "connected", "data": "Connected to log stream"}\n\n'
            while True:
                if await request.is_disconnected():
                    break

                data = await event_emitter.get_message(channel)
                if data is None:
                    await asyncio.sleep(0.1)  # avoid tight loop on None
                    continue

                # Handle different types of events
                if isinstance(data, dict) and data.get("type") == "transform_complete":
                    # Send transform completion event
                    yield json.dumps({"event": "transform_complete", "data": data})
                else:
                    # Send regular log event
                    yield json.dumps({"event": "log", "data": data})
                await asyncio.sleep(0.1)

        except asyncio.CancelledError:
            print(f"[EventEmitter] Client disconnected from sketch_id: {sketch_id}")
        except Exception as e:
            print(f"[EventEmitter] Error in stream_logs: {str(e)}")
        finally:
            await event_emitter.unsubscribe(channel)

    return EventSourceResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/sketch/{sketch_id}/logs")
def delete_scan_logs(
    sketch_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Delete all logs for a specific scan"""
    try:
        db.query(Log).filter(Log.sketch_id == sketch_id).delete()
        db.commit()
        return {"message": f"All logs have been deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete logs: {str(e)}")


@router.get("/status/scan/{scan_id}/stream")
async def stream_status(request: Request, scan_id: str, db: Session = Depends(get_db)):
    """Stream status updates for a specific scan in real-time"""

    async def status_generator():
        print("[EventEmitter] Start status generator")
        await event_emitter.subscribe(f"scan_{scan_id}_status")
        try:
            # Initial connection message
            yield 'data: {"event": "connected", "data": "Connected to status stream"}\n\n'

            while True:
                data = await event_emitter.get_message(f"scan_{scan_id}_status")
                if data is None:
                    await asyncio.sleep(0.1)
                    continue
                print(f"[EventEmitter] Received status data: {data}")
                yield f"data: {data}\n\n"

        except asyncio.CancelledError:
            print(
                f"[EventEmitter] Client disconnected from status stream for scan_id: {scan_id}"
            )
        finally:
            await event_emitter.unsubscribe(f"scan_{scan_id}_status")

    return EventSourceResponse(
        status_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
