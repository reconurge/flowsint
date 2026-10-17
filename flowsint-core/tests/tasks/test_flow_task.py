"""Regression tests for the flow Celery task."""

from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from flowsint_core.core.enums import EventLevel
from flowsint_core.core.models import Scan
from flowsint_core.tasks import flow as flow_task


def test_run_flow_marks_scan_failed_when_orchestrator_raises(monkeypatch, db_session):
    """A child enricher failure must not be recorded as a completed scan."""
    scan_id = uuid4()
    task = SimpleNamespace(
        request=SimpleNamespace(id=str(scan_id)), update_state=MagicMock()
    )
    orchestrator = MagicMock()
    orchestrator.scan.side_effect = RuntimeError("enricher failed")

    monkeypatch.setattr(flow_task, "SessionLocal", lambda: db_session)
    monkeypatch.setattr(flow_task, "FlowOrchestrator", lambda **_: orchestrator)

    with pytest.raises(RuntimeError, match="enricher failed"):
        flow_task.run_flow.run.__func__(
            task,
            [{"id": "branch-1", "name": "branch", "steps": []}],
            [],
            None,
        )

    scan = db_session.get(Scan, scan_id)
    assert scan is not None
    assert scan.status == EventLevel.FAILED
    assert scan.error == "An error occurred: enricher failed"
