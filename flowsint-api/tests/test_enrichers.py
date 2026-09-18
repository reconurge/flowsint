"""Contract for the enricher endpoints: advertised params in, launch params out."""

import uuid
from unittest.mock import MagicMock

import pytest

from app.api.routes import enrichers as enrichers_route
from flowsint_core.core.auth import create_access_token
from flowsint_core.core.models import EnricherTemplate, Profile


def _seed_template_owner(db_session, secrets):
    user = Profile(id=uuid.uuid4(), email="owner@example.com", hashed_password="x")
    db_session.add(user)
    db_session.add(
        EnricherTemplate(
            id=uuid.uuid4(),
            name="github-lookup",
            description="Look a user up on GitHub",
            category="Username",
            version=1.0,
            content={
                "name": "github-lookup",
                "category": "Username",
                "version": 1.0,
                "input": {"type": "Username"},
                "request": {"url": "https://api.github.com/users/{{username}}"},
                "response": {},
                "output": {"type": "Username"},
                "secrets": secrets,
            },
            is_public=False,
            owner_id=user.id,
        )
    )
    db_session.commit()
    return {"Authorization": f"Bearer {create_access_token({'sub': user.email})}"}


def test_template_enrichers_expose_params_schema(client, db_session):
    headers = _seed_template_owner(
        db_session,
        [{"name": "GITHUB_TOKEN", "required": True, "description": "A PAT"}],
    )

    res = client.get("/api/enrichers", headers=headers)

    assert res.status_code == 200
    [template] = [e for e in res.json() if e["name"] == "github-lookup"]
    assert template["params_schema"] == [
        {
            "name": "GITHUB_TOKEN",
            "type": "vaultSecret",
            "required": True,
            "description": "A PAT",
        }
    ]
    assert template["required_params"] is True


def test_template_enricher_without_secrets_reports_no_params(client, db_session):
    headers = _seed_template_owner(db_session, [])

    res = client.get("/api/enrichers", headers=headers)

    assert res.status_code == 200
    [template] = [e for e in res.json() if e["name"] == "github-lookup"]
    assert template["params_schema"] == []
    assert template["required_params"] is False


@pytest.fixture
def sent_task(monkeypatch):
    """Stub out Neo4j and the broker, capture what send_task was handed."""
    entity = MagicMock()
    entity.model_dump.return_value = {"address": "8.8.8.8"}
    graph_service = MagicMock()
    graph_service.get_nodes_by_ids_for_task.return_value = [entity]
    monkeypatch.setattr(
        enrichers_route, "create_graph_service", lambda **kwargs: graph_service
    )
    monkeypatch.setattr(
        enrichers_route, "create_type_registry_service", lambda db: MagicMock()
    )
    monkeypatch.setattr(
        enrichers_route.ENRICHER_REGISTRY, "enricher_exists", lambda name: True
    )

    captured = {}

    def fake_send_task(name, args=None, kwargs=None):
        captured.update(name=name, args=args, kwargs=kwargs)
        return MagicMock(id="task-123")

    monkeypatch.setattr(enrichers_route.celery, "send_task", fake_send_task)
    return captured


def _launch(client, db_session, body):
    user = Profile(id=uuid.uuid4(), email="launcher@example.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    headers = {"Authorization": f"Bearer {create_access_token({'sub': user.email})}"}
    return client.post(
        "/api/enrichers/some_enricher/launch", json=body, headers=headers
    )


def test_launch_forwards_params_as_task_kwargs(client, db_session, sent_task):
    res = _launch(
        client,
        db_session,
        {
            "node_ids": ["4:abc:1"],
            "sketch_id": str(uuid.uuid4()),
            "params": {"api_key": "abc123"},
        },
    )

    assert res.status_code == 200
    assert res.json() == {"id": "task-123"}
    assert sent_task["name"] == "run_enricher"
    assert sent_task["kwargs"] == {"params": {"api_key": "abc123"}}


def test_launch_without_params_sends_an_empty_dict(client, db_session, sent_task):
    res = _launch(
        client,
        db_session,
        {"node_ids": ["4:abc:1"], "sketch_id": str(uuid.uuid4())},
    )

    assert res.status_code == 200
    assert sent_task["kwargs"] == {"params": {}}


def test_launch_keeps_the_positional_args_unchanged(client, db_session, sent_task):
    sketch_id = str(uuid.uuid4())

    _launch(
        client,
        db_session,
        {"node_ids": ["4:abc:1"], "sketch_id": sketch_id, "params": {"k": "v"}},
    )

    enricher_name, entities, sent_sketch_id, owner_id = sent_task["args"]
    assert enricher_name == "some_enricher"
    assert entities == [{"address": "8.8.8.8"}]
    assert sent_sketch_id == sketch_id
    assert uuid.UUID(owner_id)
