import uuid
from typing import List, Optional
from celery import states
from ..core.celery import celery
from ..core.orchestrator import FlowOrchestrator
from ..core.postgre_db import SessionLocal, get_db
from ..core.vault import Vault
from ..core.types import FlowBranch
from ..core.models import Scan
from sqlalchemy.orm import Session
from ..core.logger import Logger
from ..core.enums import EventLevel
from flowsint_core.utils import to_json_serializable

db: Session = next(get_db())


@celery.task(name="run_flow", bind=True)
def run_flow(
    self,
    enricher_branches,
    serialized_objects: List[dict],
    sketch_id: str | None,
    owner_id: Optional[str] = None,
):
    session = SessionLocal()

    try:
        if not enricher_branches:
            raise ValueError("enricher_branches not provided in the input enricher")

        scan_id = uuid.UUID(self.request.id)

        scan = Scan(
            id=scan_id,
            status=EventLevel.PENDING,
            sketch_id=uuid.UUID(sketch_id) if sketch_id else None,
        )
        session.add(scan)
        session.commit()

        # Create vault instance if owner_id is provided
        vault = None
        if owner_id:
            try:
                vault = Vault(session, uuid.UUID(owner_id))
            except Exception as e:
                Logger.error(
                    sketch_id, {"message": f"Failed to create vault: {str(e)}"}
                )

        enricher_branches = [FlowBranch(**branch) for branch in enricher_branches]
        enricher = FlowOrchestrator(
            sketch_id=sketch_id,
            scan_id=str(scan_id),
            enricher_branches=enricher_branches,
            vault=vault,
        )

        # Use the synchronous scan method which internally handles the async operations
        # Pass serialized objects instead of strings - the preprocess will handle them
        results = enricher.scan(values=serialized_objects)

        scan.status = EventLevel.COMPLETED
        scan.results = to_json_serializable(results)
        session.commit()

        return {"result": scan.results}

    except Exception as ex:
        session.rollback()
        error_logs = f"An error occurred: {str(ex)}"
        print(f"Error in task: {error_logs}")

        scan = session.query(Scan).filter(Scan.id == uuid.UUID(self.request.id)).first()
        if scan:
            scan.status = EventLevel.FAILED
            scan.results = {"error": error_logs}
            session.commit()

        self.update_state(state=states.FAILURE)
        raise ex

    finally:
        session.close()
