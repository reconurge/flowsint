from app.core.db import get_db  # Supabase client
from typing import Literal
from uuid import UUID

LogLevel = Literal["info", "warn", "error", "success", "debug"]

class Logger:
    def __init__(self, db):
        self.db = db

    def emit(self, scan_id: UUID, sketch_id: UUID, content: str, level: LogLevel = "info"):
        data = {
            "scan_id": str(scan_id),
            "sketch_id": str(sketch_id),
            "type": level.upper(),
            "content": f"[{level.upper()}] {content}",
        }
        try:
            self.db.table("logs").insert(data).execute()
        except Exception as e:
            print(f"[Logger] Failed to emit log: {e}")

    def info(self, scan_id: UUID, sketch_id: UUID, content: str):
        self.emit(scan_id, sketch_id, content, level="info")

    def warn(self, scan_id: UUID, sketch_id: UUID, content: str):
        self.emit(scan_id, sketch_id, content, level="warning")

    def error(self, scan_id: UUID, sketch_id: UUID, content: str):
        self.emit(scan_id, sketch_id, content, level="error")

    def success(self, scan_id: UUID, sketch_id: UUID, content: str):
        self.emit(scan_id, sketch_id, content, level="success")
    
    def debug(self, scan_id: UUID, sketch_id: UUID, content: str):
        self.emit(scan_id, sketch_id, content, level="debug")

logger = Logger(get_db())
