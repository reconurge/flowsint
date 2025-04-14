from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from app.core.db import get_db
from app.core.celery import celery_app
from supabase import Client

app = FastAPI()

class EmailScanItem(BaseModel):
    email: str
    sketch_id:str
    
class UsernameScanItem(BaseModel):
    username: str
    sketch_id:str

@app.post("/scan/email")
async def scan(item: EmailScanItem, db: Client = Depends(get_db)):
    task_name = "email_scan"
    assert item.email is not None
    assert item.sketch_id is not None
    task = celery_app.send_task(task_name, args=[item.email])
    try:
        response = db.table("scans").insert({
            "id": task.id,
            "status": "pending",
            "scan_name": task_name,
            "value":item.email,
            "sketch_id": item.sketch_id
        }).execute()
        return {"id": task.id, "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.post("/scan/username")
async def scan(item: UsernameScanItem, db: Client = Depends(get_db)):
    task_name = "username_scan"
    assert item.username is not None
    assert item.sketch_id is not None
    task = celery_app.send_task(task_name, args=[item.username])
    try:
        response = db.table("scans").insert({
            "id": task.id,
            "status": "pending",
            "scan_name": task_name,
            "value":item.username,
            "sketch_id": item.sketch_id
        }).execute()
        return {"id": task.id, "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}
