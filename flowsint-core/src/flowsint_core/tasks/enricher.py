import uuid
import asyncio
from typing import List, Optional
from celery import states
from flowsint_enrichers import ENRICHER_REGISTRY, load_all_enrichers
from ..core.celery import celery
from ..core.postgre_db import SessionLocal, get_db
from ..core.vault import Vault
from ..core.models import Scan
from sqlalchemy.orm import Session
from ..core.logger import Logger
from ..core.enums import EventLevel
from flowsint_core.utils import to_json_serializable

# Auto-discover and register all enrichers
load_all_enrichers()

db: Session = next(get_db())


@celery.task(name="run_enricher", bind=True)
def run_enricher(
    self,
    enricher_name: str,
    serialized_objects: List[dict],
    sketch_id: str | None,
    owner_id: Optional[str] = None,
):
    session = SessionLocal()

    try:

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

        if not ENRICHER_REGISTRY.enricher_exists(enricher_name):
            raise ValueError(f"Enricher '{enricher_name}' not found in registry")

        enricher = ENRICHER_REGISTRY.get_enricher(
            name=enricher_name,
            sketch_id=sketch_id,
            scan_id=scan_id,
            vault=vault,
        )

        # Deserialize objects back into Pydantic models
        # The preprocess method in Enricher will handle these already-parsed objects
        results = asyncio.run(enricher.execute(values=serialized_objects))

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
