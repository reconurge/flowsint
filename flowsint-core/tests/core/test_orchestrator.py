"""Tests for failure propagation from flow enrichers."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from flowsint_core.core.orchestrator import FlowOrchestrator
from flowsint_core.core.types import FlowBranch


def test_async_scan_propagates_enricher_failure(monkeypatch):
    """A failed child enricher must make the surrounding flow fail too."""
    monkeypatch.setattr("flowsint_core.core.orchestrator.Logger", MagicMock())
    monkeypatch.setattr(FlowOrchestrator, "_create_execution_log", lambda self: None)
    monkeypatch.setattr(FlowOrchestrator, "_load_enrichers", lambda self: None)

    branch = FlowBranch(
        id="branch-1",
        name="branch",
        steps=[
            {
                "nodeId": "failing-enricher",
                "type": "enricher",
                "inputs": {},
                "outputs": {},
                "status": "pending",
                "branchId": "branch-1",
                "depth": 0,
            }
        ],
    )
    orchestrator = FlowOrchestrator("sketch-1", "scan-1", [branch])
    failing_enricher = MagicMock()
    failing_enricher.name.return_value = "failing-enricher"
    failing_enricher.execute = AsyncMock(side_effect=RuntimeError("enricher failed"))
    orchestrator.enrichers = {"failing-enricher": failing_enricher}

    with pytest.raises(RuntimeError, match="enricher failed"):
        asyncio.run(orchestrator._async_scan([{"value": "input"}]))
