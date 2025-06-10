import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.postgre_db import get_db
from app.models.models import Log, Sketch
from app.core.events import event_emitter
from sse_starlette.sse import EventSourceResponse
from app.api.deps import get_current_user
from app.models.models import Profile, Sketch
import json
import asyncio
from datetime import datetime, timedelta
from enum import Enum

class ScannerStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

router = APIRouter()

@router.get("/sketch/{sketch_id}")
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
        raise HTTPException(status_code=404, detail=f"Sketch with id {sketch_id} not found")

    print(f"[EventEmitter] Fetching logs for sketch {sketch_id} (limit: {limit}, since: {since})")
    query = db.query(Log).filter(Log.sketch_id == sketch_id).order_by(Log.created_at.asc())
    
    if since:
        query = query.filter(Log.created_at > since)
    else:
        # Default to last 24 hours if no since parameter
        query = query.filter(Log.created_at > datetime.utcnow() - timedelta(days=1))
        
    logs = query.limit(limit).all()
    
    results = [{
        "id": str(log.id),
        "sketch_id": str(log.sketch_id) if log.sketch_id else None,
        "type": log.type,
        "content": log.content.split("] ", 1)[1] if "] " in log.content else log.content,  # Remove prefix if exists
        "created_at": log.created_at.isoformat()
    } for log in logs]
    
    return results


@router.get("/sketch/{sketch_id}/stream")
async def stream_logs(request: Request, sketch_id: str,
                      db: Session = Depends(get_db), 
                    #   current_user: Profile = Depends(get_current_user)
                      ):
    """Stream logs for a specific scan in real-time"""

    # Check if sketch exists
    sketch = db.query(Sketch).filter(Sketch.id == sketch_id).first()
    if not sketch:
        raise HTTPException(status_code=404, detail=f"Sketch with id {sketch_id} not found")

    async def event_generator():
        print("[EventEmitter] Start generator")
        channel = sketch_id
        await event_emitter.subscribe(channel)
        try:
            # Initial connection message
            yield "data: {\"event\": \"connected\", \"data\": \"Connected to log stream\"}\n\n"

            while True:
                if await request.is_disconnected():
                    print(f"[EventEmitter] Client disconnected from sketch_id: {sketch_id}")
                    break
                    
                data = await event_emitter.get_message(channel)
                if data is None:
                    await asyncio.sleep(0.1)  # avoid tight loop on None
                    continue
                    
                print(f"[EventEmitter] Received data: {data}")
                
                # Handle different types of events
                if isinstance(data, dict) and data.get('type') == 'scanner_complete':
                    # Send scanner completion event
                    yield json.dumps({'event': 'scanner_complete', 'data': data})
                else:
                    # Send regular log event
                    yield json.dumps({'event': 'log', 'data': data})

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
            "X-Accel-Buffering": "no"
        }
    )

@router.delete("/sketch/{sketch_id}")
def delete_scan_logs(sketch_id:str, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    """Delete all logs for a specific scan"""
    try:
        db.query(Log).filter(Log.sketch_id == sketch_id).delete()
        db.commit()
        return {"message": f"All logs have been deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete logs: {str(e)}")

@router.get("/status/scan/{scan_id}/stream")
async def stream_status(request: Request, scan_id: str,
                      db: Session = Depends(get_db)):
    """Stream status updates for a specific scan in real-time"""

    async def status_generator():
        print("[EventEmitter] Start status generator")
        await event_emitter.subscribe(f"scan_{scan_id}_status")
        try:
            # Initial connection message
            yield "data: {\"event\": \"connected\", \"data\": \"Connected to status stream\"}\n\n"

            while True:
                data = await event_emitter.get_message(f"scan_{scan_id}_status")
                if data is None:
                    await asyncio.sleep(0.1)
                    continue
                print(f"[EventEmitter] Received status data: {data}")
                yield f"data: {json.dumps({'event': 'status_update', 'data': data})}\n\n"

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
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/status/scan/{scan_id}")
async def update_status(
    scan_id: str,
    status: ScannerStatus,
    details: dict = None,
    db: Session = Depends(get_db)
):
    """Update the status of a scan"""
    status_data = {
        "status": status,
        "timestamp": datetime.utcnow().isoformat(),
        "details": details or {}
    }
    
    await event_emitter.emit(f"scan_{scan_id}_status", status_data)
    return {"message": "Status updated successfully"}