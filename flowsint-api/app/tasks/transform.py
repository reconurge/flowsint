import json
from app.core.celery import celery_app
from app.scanners.orchestrator import TransformOrchestrator
from celery import states
from app.core.db import get_db
from app.utils import extract_transform
from typing import List
import os
from dotenv import load_dotenv
from typing import List
from app.neo4j.connector import Neo4jConnection

load_dotenv()



URI = os.getenv("NEO4J_URI_BOLT")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)


@celery_app.task(name="run_transform", bind=True)
def run_scan(self, transform_schema, values: List[str], sketch_id: str | None):
    db=get_db()
    try:
        extracted = extract_transform(transform_schema)
        scanner_names = extracted["scanner_names"]
        db.table("scans").insert({
                    "id": self.request.id,
                    "status": "pending",
                    "scanner_names": scanner_names,
                    "values": values,
                    "sketch_id": sketch_id,
                    "results": []
                }).execute()
        
        scanner = TransformOrchestrator(sketch_id, "scan_0", scanner_names = scanner_names, neo4j_conn=neo4j_connection)
        results = scanner.execute(values=values)
        status = "finished" if "error" not in results else "error"
        db.table("scans").update({
            "status": status,
            "results":scanner.results_to_json(results=results)
        }).eq("id", self.request.id).execute()
        return {"result": scanner.results_to_json(results=results)}
        
    except Exception as ex:
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