from uuid import UUID
from sqlalchemy.orm import Session
from typing import Literal
from datetime import datetime
from app.models.models import Log

LogLevel = Literal["info", "warn", "error", "success", "debug"]

LEVEL_MAP = {
    "info": "INFO",
    "warn": "WARN",
    "error": "ERROR",
    "success": "SUCCESS",
    "debug": "DEBUG",
}


class Logger:
    def __init__(self, db: Session):
        self.db = db

    def emit(
        self,
        scan_id: UUID,
        content: str,
        sketch_id: UUID | None = None,
        level: LogLevel = "info",
    ):
        level_str = LEVEL_MAP.get(level, "INFO")

        log = Log(
            scan_id=scan_id,
            sketch_id=sketch_id,
            type=level_str,
            content=f"[{level_str}] {content}",
            created_at=datetime.utcnow(),  # si ton modèle n’a pas de default server-side
        )

        try:
            self.db.add(log)
            self.db.commit()
            print(f"[{level_str}] {content}")
        except Exception as e:
            self.db.rollback()
            print(f"[Logger] Failed to emit log: {e}")

    def info(self, scan_id: UUID, content: str, sketch_id: UUID | None = None):
        self.emit(scan_id, content, sketch_id, level="info")

    def warn(self, scan_id: UUID, content: str, sketch_id: UUID | None = None):
        self.emit(scan_id, content, sketch_id, level="warn")

    def error(self, scan_id: UUID, content: str, sketch_id: UUID | None = None):
        self.emit(scan_id, content, sketch_id, level="error")

    def success(self, scan_id: UUID, content: str, sketch_id: UUID | None = None):
        self.emit(scan_id, content, sketch_id, level="success")

    def debug(self, scan_id: UUID, content: str, sketch_id: UUID | None = None):
        self.emit(scan_id, content, sketch_id, level="debug")
