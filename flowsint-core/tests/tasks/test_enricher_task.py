"""Tests that the enricher Celery tasks forward launch params downstream."""

import uuid
from typing import Any, Dict, List
from unittest.mock import MagicMock

import pytest

from flowsint_core.tasks import enricher as enricher_task


class RecordingEnricher:
    """Stands in for a real enricher: records nothing, executes to no results."""

    async def execute(self, values: List[dict]) -> List[Any]:
        return []


@pytest.fixture
def captured_kwargs(monkeypatch):
    """Neutralise the task's DB and vault work, capture the enricher kwargs."""
    monkeypatch.setattr(enricher_task, "SessionLocal", MagicMock())
    monkeypatch.setattr(enricher_task, "create_vault_service", MagicMock())

    captured: Dict[str, Any] = {}

    def fake_get_enricher(**kwargs):
        captured.update(kwargs)
        return RecordingEnricher()

    monkeypatch.setattr(
        enricher_task.ENRICHER_REGISTRY, "enricher_exists", lambda name: True
    )
    monkeypatch.setattr(
        enricher_task.ENRICHER_REGISTRY, "get_enricher", fake_get_enricher
    )
    return captured


def _run(**kwargs):
    return enricher_task.run_enricher.apply(
        args=["some_enricher", [], str(uuid.uuid4()), str(uuid.uuid4())],
        kwargs=kwargs,
        throw=True,
    )


def test_run_enricher_forwards_params_to_the_enricher(captured_kwargs):
    _run(params={"api_key": "abc123", "limit": "10"})

    assert captured_kwargs["params"] == {"api_key": "abc123", "limit": "10"}


def test_run_enricher_without_params_passes_an_empty_dict(captured_kwargs):
    # The shape of a message queued by an API instance that predates `params`.
    _run()

    assert captured_kwargs["params"] == {}


def test_run_template_enricher_forwards_params_to_the_template_enricher(monkeypatch):
    monkeypatch.setattr(enricher_task, "SessionLocal", MagicMock())
    monkeypatch.setattr(enricher_task, "create_vault_service", MagicMock())

    db_template = MagicMock()
    db_template.content = {
        "name": "example",
        "category": "Ip",
        "version": 1.0,
        "input": {"type": "Ip"},
        "request": {"url": "https://api.example.com/{{address}}"},
        "response": {},
        "output": {"type": "Ip"},
    }
    template_service = MagicMock()
    template_service.find_by_name.return_value = db_template
    monkeypatch.setattr(
        enricher_task, "create_enricher_template_service", lambda s: template_service
    )

    captured: Dict[str, Any] = {}

    def fake_template_enricher(**kwargs):
        captured.update(kwargs)
        return RecordingEnricher()

    monkeypatch.setattr(enricher_task, "TemplateEnricher", fake_template_enricher)

    enricher_task.run_template_enricher.apply(
        args=["example", [], str(uuid.uuid4()), str(uuid.uuid4())],
        kwargs={"params": {"GITHUB_TOKEN": "ghp_xxx"}},
        throw=True,
    )

    assert captured["params"] == {"GITHUB_TOKEN": "ghp_xxx"}
