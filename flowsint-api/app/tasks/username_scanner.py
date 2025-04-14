from app.core.db import get_db
from app.core.celery import celery_app
import asyncio
import traceback
from celery import states
from app.workers.username_scanner import perform_sherlock_research

@celery_app.task(name="username_scan", bind=True)
def username_scan(self, username: str):
    db = get_db()
    try:
        results = asyncio.run(perform_sherlock_research(username))

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
