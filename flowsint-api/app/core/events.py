from typing import Dict, Set, List
from fastapi import FastAPI
from asyncio import Queue
import json
import asyncio
from datetime import datetime, timedelta

GLOBAL_STREAM = "global"

class EventEmitter:
    def __init__(self):
        self.clients: Dict[str, Set[Queue]] = {}
        print("[EventEmitter] Initialized")

    async def subscribe(self, scan_id: str) -> Queue:
        if scan_id not in self.clients:
            self.clients[scan_id] = set()
            print(f"[EventEmitter] New stream created for scan_id: {scan_id}")
        
        queue = Queue()
        self.clients[scan_id].add(queue)
        print(f"[EventEmitter] Client subscribed to scan_id: {scan_id}, total clients: {len(self.clients[scan_id])}")
        return queue

    async def unsubscribe(self, scan_id: str, queue: Queue):
        if scan_id in self.clients:
            self.clients[scan_id].remove(queue)
            print(f"[EventEmitter] Client unsubscribed from scan_id: {scan_id}, remaining clients: {len(self.clients[scan_id])}")
            if not self.clients[scan_id]:
                del self.clients[scan_id]
                print(f"[EventEmitter] Stream removed for scan_id: {scan_id} (no more clients)")

    async def emit(self, scan_id: str, data: dict):
        print(f"[EventEmitter] Emitting event to scan_id: {scan_id}, data: {json.dumps(data)}")
        # Always emit to global stream
        if GLOBAL_STREAM in self.clients:
            print(f"[EventEmitter] Broadcasting to {len(self.clients[GLOBAL_STREAM])} global listeners")
            for queue in self.clients[GLOBAL_STREAM]:
                await queue.put(data)
        else:
            print("[EventEmitter] No global listeners")
        
        # Emit to specific scan stream if it exists
        if scan_id in self.clients and scan_id != GLOBAL_STREAM:
            print(f"[EventEmitter] Broadcasting to {len(self.clients[scan_id])} scan-specific listeners")
            for queue in self.clients[scan_id]:
                await queue.put(data)
        elif scan_id != GLOBAL_STREAM:
            print(f"[EventEmitter] No listeners for scan_id: {scan_id}")

    def emit_sync(self, scan_id: str, data: dict):
        """Synchronous version of emit for use in Celery tasks"""
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're in an async context, create a new event loop
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                new_loop.run_until_complete(self.emit(scan_id, data))
            finally:
                new_loop.close()
        else:
            # If we're not in an async context, use the existing loop
            loop.run_until_complete(self.emit(scan_id, data))

event_emitter = EventEmitter()

def init_events(app: FastAPI):
    """Initialize the event system in the FastAPI app"""
    print("[EventEmitter] Events initialized in FastAPI app") 