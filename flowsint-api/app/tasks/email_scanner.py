from supabase import create_client
from app.core.db import get_db
from app.core.celery import celery_app
import traceback
import asyncio
from celery import states
from app.workers.email_scanner import perform_holehe_research

@celery_app.task(name="email_scan", bind=True)
def email_scan(self, email: str):
    db = get_db()  # 🔥 On récupère le client ici
    try:
        # Run the Holehe research
        results = asyncio.run(perform_holehe_research(email))

        # Update database with results
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
        
        raise ex  # Laisser Celery gérer l'erreur
