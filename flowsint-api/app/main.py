from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from app.core.celery import celery_app
from app.scanners.registry import ScannerRegistry
from app.scanners.orchestrator import TransformOrchestrator
from app.core.auth import get_current_user 
from app.models.types import OSINTTypeUtils
from typing import List

app = FastAPI()

class ScanRequest(BaseModel):
    values: List[str]
    sketch_id: str
    scanner: str

class TransformValidateRequest(BaseModel):
    scanners: List[str] = Field(..., description="Ordered list of scanners to apply")

@app.post("/scan")
async def scan(
    item: ScanRequest,
    user=Depends(get_current_user)
):
    try:
        if not ScannerRegistry.scanner_exists(name=item.scanner):
            raise HTTPException(status_code=400, detail="Scanner not found")
        # user_id = user.get("sub")
        task = celery_app.send_task("run_scan", args=[item.scanner, item.values, item.sketch_id])
        return {"id": task.id}
    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    
@app.get("/scanners")
async def get_scans_list():
    return {"scanners": ScannerRegistry.list()}

@app.post("/transforms/validate")
async def scan(
    transform: TransformValidateRequest,
):
    try:
        orchestrator = TransformOrchestrator("",
        scanner_names=transform.scanners)
        is_valid = orchestrator.preprocess()
        return {"valid": is_valid}
    except Exception as e:
        return {"valid": False, "reason": str(e)}

@app.get("/transforms/nodes")
async def get_scans_list():
    scanners = ScannerRegistry.list_by_category()
    
    # Aplatir les scanners par catégorie en une liste
    flattened_scanners = {
        category: [
            {
                "class_name": scanner["class_name"],
                "name": scanner["name"],
                "module": scanner["module"],
                "doc": scanner["doc"],
                "key": scanner["key"],
                "inputs": scanner["inputs"],
                "outputs": scanner["outputs"],
            }
            for scanner in scanner_list
        ]
        for category, scanner_list in scanners.items()
    }
    
    # Ajouter la clé "types" avec les types OSINT
    flattened_scanners["types"] = OSINTTypeUtils.get_osint_type_nodes()

    return {"items": flattened_scanners}
@app.get("/health")
async def health():
    return {"status": "ok"}
