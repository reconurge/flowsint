from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from app.core.db import get_db
from app.core.celery import celery_app
from supabase import Client

app = FastAPI()

class EmailScanItem(BaseModel):
    email: str
    investigation_id:str

@app.post("/scan/")
async def scan(item: EmailScanItem, db: Client = Depends(get_db)):
    task_name = "email_scan"
    task = celery_app.send_task(task_name, args=[item.email])
    assert item.email is not None
    assert item.investigation_id is not None
    try:
        response = db.table("scans").insert({
            "id": task.id,
            "status": "pending",
            "scan_name": task_name,
            "value":item.email,
            "investigation_id": item.investigation_id
        }).execute()
        return {"id": task.id, "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.get("/health")
async def health():
    return {"status": "ok"}
