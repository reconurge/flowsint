from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel

from app.core.celery import celery_app
from app.scanners.registry import ScannerRegistry
from app.core.auth import get_current_user 

app = FastAPI()

class ScanRequest(BaseModel):
    value: str
    sketch_id: str
    scanner: str

@app.post("/scan")
async def scan(
    item: ScanRequest,
    user=Depends(get_current_user)
):
    try:
        if not ScannerRegistry.scanner_exists(name=item.scanner):
            raise HTTPException(status_code=400, detail="Scanner not found")
        user_id = user.get("sub")
        task = celery_app.send_task("run_scan", args=[item.scanner, item.value, item.sketch_id])
        print(user_id)
        return {"id": task.id}
    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.get("/health")
async def health():
    return {"status": "ok"}
