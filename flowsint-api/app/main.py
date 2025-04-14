from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from app.core.db import get_db
from app.core.celery import celery_app
from supabase import Client

app = FastAPI()

class ScanRequest(BaseModel):
    value: str
    sketch_id: str
    scanner: str

@app.post("/scan")
async def scan(item: ScanRequest, db: Client = Depends(get_db)):
    try:
        assert item.value is not None
        assert item.sketch_id is not None
        assert item.scanner is not None
        
        task = celery_app.send_task("run_scan", args=[item.scanner, item.value])
     
        return {"id": task.id }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}