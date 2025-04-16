from app.core.celery import celery_app
from app.scanners.registry import ScannerRegistry
import traceback
from celery import states
from  app.core.db import get_db
@celery_app.task(name="run_scan", bind=True)
def run_scan(self, scanner_name: str, value: str, sketch_id: str):
    db=get_db()
    try:
        scanner = ScannerRegistry.get_scanner(scanner_name, self.request.id)
        results = scanner.execute(value, db=db, sketch_id=sketch_id)
        # status = "finished" if "error" not in results else "error"
        db.table("scans").update({
            "status": "finished",
            "results": results
        }).eq("id", self.request.id).execute()
        return {"result": results}
        
    except Exception as ex:
        # error_logs = traceback.format_exc().split("\n")
        error_logs= "an error occured"
        print(f"Error in task: {error_logs}")
        db.table("scans").update({
            "status": "error",
            "results": {"error": error_logs}
        }).eq("id", self.request.id).execute()
        self.update_state(
            state=states.FAILURE,
        )
        raise ex