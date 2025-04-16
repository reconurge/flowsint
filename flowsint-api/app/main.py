from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.core.celery import celery_app
from app.scanners.registry import ScannerRegistry

app = FastAPI()

class ScanRequest(BaseModel):
    value: str
    sketch_id: str
    scanner: str

@app.post("/scan")
async def scan(item: ScanRequest):
    try:
        if not item.value or not item.sketch_id or not item.scanner:
            raise HTTPException(status_code=400, detail="Missing required fields")
        if not ScannerRegistry.scanner_exists(name=item.scanner):
            raise HTTPException(status_code=400, detail="Scanner not found")
        task = celery_app.send_task("run_scan", args=[item.scanner, item.value, item.sketch_id])
        
        return {"id": task.id}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}