from app.core.celery import celery_app
from app.core.db import get_db
from app.scanners.registry import ScannerRegistry
import traceback
from celery import states

@celery_app.task(name="run_scan", bind=True)
def run_scan(self, scanner_name: str, value: str):
    db = get_db()
    try:
        scanner = ScannerRegistry.get_scanner(scanner_name, self.request.id)
        results = scanner.execute(value)
        status = "finished" if "error" not in results else "error"
        db.table("scans").update({
            "status": status,
            "results": results
        }).eq("id", self.request.id).execute()
        return {"result": results}
        
    except Exception as ex:
        error_logs = traceback.format_exc().split("\n")
        print(f"Error in task: {error_logs}")
        db.table("scans").update({
            "status": "error",
            "results": {"error": error_logs}
        }).eq("id", self.request.id).execute()
        self.update_state(
            state=states.FAILURE,
            meta={
                "exc_type": type(ex).__name__,
                "exc_message": error_logs,
            },
        )
        raise ex