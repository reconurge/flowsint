import os
import uuid
import asyncio
from dotenv import load_dotenv
from typing import List, Optional
from celery import states
from flowsint_core.core.registry import TransformRegistry
from ..core.celery import celery
from ..core.postgre_db import SessionLocal, get_db
from ..core.graph_db import Neo4jConnection
from ..core.vault import Vault
from ..core.models import Scan
from sqlalchemy.orm import Session
from ..core.logger import Logger
from ..core.enums import EventLevel
from flowsint_core.utils import to_json_serializable

load_dotenv()

URI = os.getenv("NEO4J_URI_BOLT")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)
db: Session = next(get_db())
logger = Logger()


@celery.task(name="run_transform", bind=True)
def run_transform(
    self,
    transform_name: str,
    values: List[str],
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

        if not TransformRegistry.transform_exists(transform_name):
            raise ValueError(f"Transform '{transform_name}' not found in registry")

        transform = TransformRegistry.get_transform(
            name=transform_name,
            sketch_id=sketch_id,
            scan_id=scan_id,
            neo4j_conn=neo4j_connection,
            vault=vault,
        )

        results = asyncio.run(transform.execute(values=values))

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
