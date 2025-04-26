from uuid import UUID
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from app.core.db import get_db
from app.scanners.registry import ScannerRegistry
from app.core.auth import get_current_user
from app.utils import extract_input_schema
from app.core.celery import celery_app 
# Import types
from app.types.domain import MinimalDomain
from app.types.ip import MinimalIp
from typing import List
from app.scanners.orchestrator import TransformOrchestrator

app = FastAPI()
    
@app.get("/scanners")
async def get_scans_list():
    return {"scanners": ScannerRegistry.list()}

@app.get("/transforms/nodes")
async def get_scans_list():
    scanners = ScannerRegistry.list_by_category()

    # Flatten scanner nodes
    flattened_scanners = {
        category: [
            {
                "class_name": scanner["class_name"],
                "name": scanner["name"],
                "module": scanner["module"],
                "doc": scanner["doc"],
                "inputs": scanner["inputs"],
                "outputs": scanner["outputs"],
                "type": "scanner"
            }
            for scanner in scanner_list
        ]
        for category, scanner_list in scanners.items()
    }

    # Add your object types under a dedicated category (e.g., "types")
    object_inputs = [
        extract_input_schema("MinimalDomain", MinimalDomain),
        extract_input_schema("MinimalIp", MinimalIp),
    ]

    flattened_scanners["inputs"] = object_inputs

    return {"items": flattened_scanners}


class LaunchTransformPayload(BaseModel):
    values: List[str]
    
@app.post("/transforms/{transform_id}/launch")
async def launch_transform(
    transform_id: UUID,
    payload: LaunchTransformPayload,
    user=Depends(get_current_user)
):
    db = get_db()
    try:
        response = db.table("transforms").select("*").eq("id", str(transform_id)).single().execute()
        if response.data is None:
            raise HTTPException(status_code=404, detail="Transform not found")
        
        task = celery_app.send_task("run_transform", args=[response.data["transform_schema"], payload.values, None])
        return {"id": task.id}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Transform not found")
    return {
        "results": results,
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
