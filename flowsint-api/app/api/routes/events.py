from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse
import json
import asyncio
from datetime import datetime

from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.events import event_emitter
from flowsint_core.core.models import Profile
from flowsint_core.core.services import (
    create_log_service,
    NotFoundError,
    PermissionDeniedError,
    DatabaseError,
)
from app.api.deps import get_current_user, get_current_user_sse

router = APIRouter()


@router.get("/sketch/{sketch_id}/logs")
def get_logs_by_sketch(
    sketch_id: str,
    limit: int = 100,
    since: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Get historical logs for a specific sketch with optional filtering."""
    service = create_log_service(db)
    try:
        return service.get_logs_by_sketch(sketch_id, current_user.id, limit, since)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/sketch/{sketch_id}/stream")
async def stream_events(
    request: Request,
    sketch_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user_sse),
):
    """Stream events for a specific sketch in real-time."""
    service = create_log_service(db)
    try:
        # Verify permission
        service._get_sketch_with_permission(sketch_id, current_user.id, ["read"])
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")

    async def event_generator():
        channel = sketch_id
        await event_emitter.subscribe(channel)
        try:
            yield 'data: {"event": "connected", "data": "Connected to log stream"}\n\n'
            while True:
                if await request.is_disconnected():
                    break

                data = await event_emitter.get_message(channel)
                if data is None:
                    await asyncio.sleep(0.1)
                    continue

                if isinstance(data, dict) and data.get("type") == "enricher_complete":
                    yield json.dumps({"event": "enricher_complete", "data": data})
                else:
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
    """Delete all logs for a specific sketch."""
    service = create_log_service(db)
    try:
        return service.delete_logs_by_sketch(sketch_id, current_user.id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sketch/{sketch_id}/status/stream")
async def stream_sketch_status(
    request: Request,
    sketch_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user_sse),
):
    """Stream COMPLETED events for a specific sketch (for graph refresh)."""
    service = create_log_service(db)
    try:
        service._get_sketch_with_permission(sketch_id, current_user.id, ["read"])
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")

    async def status_generator():
        channel = f"{sketch_id}_status"
        await event_emitter.subscribe(channel)
        try:
            yield json.dumps({"event": "connected", "data": "Connected to status stream"})

            while True:
                if await request.is_disconnected():
                    break

                data = await event_emitter.get_message(channel)
                if data is None:
                    await asyncio.sleep(0.1)
                    continue

                yield json.dumps({"event": "status", "data": data})
                await asyncio.sleep(0.1)

        except asyncio.CancelledError:
            print(f"[EventEmitter] Client disconnected from status stream for sketch_id: {sketch_id}")
        except Exception as e:
            print(f"[EventEmitter] Error in stream_sketch_status: {str(e)}")
        finally:
            await event_emitter.unsubscribe(channel)

    return EventSourceResponse(
        status_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/status/scan/{scan_id}/stream")
async def stream_status(
    request: Request,
    scan_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user_sse),
):
    """Stream status updates for a specific scan in real-time."""
    service = create_log_service(db)
    try:
        service.get_scan_with_permission(scan_id, current_user.id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")

    async def status_generator():
        print("[EventEmitter] Start status generator")
        await event_emitter.subscribe(f"scan_{scan_id}_status")
        try:
            yield 'data: {"event": "connected", "data": "Connected to status stream"}\n\n'

            while True:
                data = await event_emitter.get_message(f"scan_{scan_id}_status")
                if data is None:
                    await asyncio.sleep(0.1)
                    continue
                print(f"[EventEmitter] Received status data: {data}")
                yield f"data: {data}\n\n"

        except asyncio.CancelledError:
            print(f"[EventEmitter] Client disconnected from status stream for scan_id: {scan_id}")
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
