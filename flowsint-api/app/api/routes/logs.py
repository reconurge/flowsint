from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.postgre_db import get_db
from app.models.models import Log
from app.core.events import event_emitter, GLOBAL_STREAM
from sse_starlette.sse import EventSourceResponse
from asyncio import Queue
import json
import asyncio
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/stream")
async def stream_global_logs():
    """Stream all logs in real-time"""
    print("[EventEmitter] New client requesting global stream")
    return await stream_logs(GLOBAL_STREAM)

@router.get("/{scan_id}/stream")
async def stream_logs(scan_id: str):
    """Stream logs for a specific scan in real-time"""
    async def event_generator():
        queue = await event_emitter.subscribe(scan_id)
        try:
            while True:
                data = await queue.get()
                yield {
                    "event": "log",
                    "data": json.dumps(data)
                }
        except asyncio.CancelledError:
            print(f"[EventEmitter] Client disconnected from scan_id: {scan_id}")
            await event_emitter.unsubscribe(scan_id, queue)

    return EventSourceResponse(event_generator())

@router.get("")
def get_logs(
    limit: int = 100,
    scan_id: str | None = None,
    since: datetime | None = None,
    db: Session = Depends(get_db)
):
    """Get historical logs with optional filtering"""
    print(f"[EventEmitter] Fetching logs (limit: {limit}, scan_id: {scan_id}, since: {since})")
    query = db.query(Log).order_by(Log.created_at.desc())
    
    if scan_id and scan_id != GLOBAL_STREAM:
        query = query.filter(Log.scan_id == scan_id)
        
    if since:
        query = query.filter(Log.created_at > since)
    else:
        # Default to last 24 hours if no since parameter
        query = query.filter(Log.created_at > datetime.utcnow() - timedelta(days=1))
        
    logs = query.limit(limit).all()
    
    results = [{
        "id": str(log.id),
        "scan_id": str(log.scan_id) if log.scan_id else None,
        "sketch_id": str(log.sketch_id) if log.sketch_id else None,
        "type": log.type,
        "content": log.content.split("] ", 1)[1] if "] " in log.content else log.content,  # Remove prefix if exists
        "created_at": log.created_at.isoformat()
    } for log in logs]
    
    print(f"[EventEmitter] Returning {len(results)} logs")
    return results

@router.delete("")
def delete_all_logs(db: Session = Depends(get_db)):
    """Delete all logs"""
    try:
        db.query(Log).delete()
        db.commit()
        return {"message": "All logs have been deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete logs: {str(e)}")

@router.delete("/{scan_id}")
def delete_scan_logs(db: Session = Depends(get_db)):
    """Delete all logs for a specific scan"""
    try:
        db.query(Log).delete()
        db.commit()
        return {"message": f"All logs have been deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete logs: {str(e)}") 