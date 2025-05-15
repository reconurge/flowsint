from app.core.celery import celery_app
from app.scanners.orchestrator import TransformOrchestrator
from celery import states
from app.core.db import get_db
from typing import List
import os
from dotenv import load_dotenv
from typing import List
from app.neo4j.connector import Neo4jConnection
from app.types.transform import FlowBranch

load_dotenv()

URI = os.getenv("NEO4J_URI_BOLT")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)


@celery_app.task(name="run_transform", bind=True)
def run_scan(self, transform_branches, values: List[str], sketch_id: str | None):
    db = get_db()
    try:
        if not transform_branches:
            raise ValueError("transform_branches not provided in the input transform")
        
        res = db.table("scans").insert({
                    "id": self.request.id,
                    "status": "pending",
                    "values": values,
                    "sketch_id": sketch_id,
                    "results": []
                }).execute()
        scan_id = res.data[0]["id"]
        
        transform_branches = [FlowBranch(**branch) for branch in transform_branches]
        scanner = TransformOrchestrator(sketch_id, scan_id, transform_branches=transform_branches, neo4j_conn=neo4j_connection)
        results = scanner.execute(values=values)
        status = "finished" if "error" not in results else "error"
        db.table("scans").update({
            "status": status,
            "results": scanner.results_to_json(results=results)
        }).eq("id", self.request.id).execute()
        return {"result": scanner.results_to_json(results=results)}
        
    except Exception as ex:
        error_logs = f"An error occurred: {str(ex)}"
        print(f"Error in task: {error_logs}")
        db.table("scans").update({
            "status": "error",
            "results": {"error": error_logs}
        }).eq("id", self.request.id).execute()
        self.update_state(
            state=states.FAILURE,
        )
        raise ex