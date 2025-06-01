import os
import uuid
from dotenv import load_dotenv
from typing import List

from celery import states
from app.core.celery import celery
from app.scanners.orchestrator import TransformOrchestrator
from app.core.postgre_db import SessionLocal, get_db
from app.core.graph_db import Neo4jConnection
from app.types.transform import FlowBranch
from app.models.models import Scan
from sqlalchemy.orm import Session
from app.core.logger import Logger
load_dotenv()

URI = os.getenv("NEO4J_URI_BOLT")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)
db: Session = next(get_db())
logger = Logger(db)

@celery.task(name="run_transform", bind=True)
def run_scan(self, transform_branches, values: List[str], sketch_id: str | None):
    session = SessionLocal()
    try:
        if not transform_branches:
            raise ValueError("transform_branches not provided in the input transform")

        scan_id = uuid.UUID(self.request.id)

        scan = Scan(
            id=scan_id,
            status="pending",
            values=values,
            sketch_id=uuid.UUID(sketch_id) if sketch_id else None,
            results={}
        )
        session.add(scan)
        session.commit()

        transform_branches = [FlowBranch(**branch) for branch in transform_branches]
        scanner = TransformOrchestrator(
            sketch_id=sketch_id,
            scan_id=str(scan_id),
            transform_branches=transform_branches,
            neo4j_conn=neo4j_connection,
            logger=logger
        )
        results = scanner.execute(values=values)

        scan.status = "finished" if "error" not in results else "error"
        scan.results = scanner.results_to_json(results)
        session.commit()

        return {"result": scan.results}

    except Exception as ex:
        session.rollback()
        error_logs = f"An error occurred: {str(ex)}"
        print(f"Error in task: {error_logs}")

        scan = session.query(Scan).filter(Scan.id == uuid.UUID(self.request.id)).first()
        if scan:
            scan.status = "error"
            scan.results = {"error": error_logs}
            session.commit()

        self.update_state(state=states.FAILURE)
        raise ex

    finally:
        session.close()
