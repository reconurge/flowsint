"""Contract for the enricher endpoints: advertised params in, launch params out."""

import uuid
from unittest.mock import MagicMock

import pytest

from app.api.routes import enrichers as enrichers_route
from flowsint_core.core.auth import create_access_token
from flowsint_core.core.models import (
    EnricherTemplate,
    Investigation,
    InvestigationUserRole,
    Profile,
    Sketch,
)
from flowsint_core.core.types import Role


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


def _seed_user(db_session, roles):
    """A user, their own investigation and sketch, and the role row that decides
    what they may do there. `roles=()` seeds no role row at all, which is how a
    stranger stands towards someone else's investigation."""
    user = Profile(
        id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com", hashed_password="x"
    )
    investigation = Investigation(id=uuid.uuid4(), name="Case", owner_id=user.id)
    sketch = Sketch(
        id=uuid.uuid4(),
        title="Board",
        owner_id=user.id,
        investigation_id=investigation.id,
    )
    db_session.add_all([user, investigation, sketch])
    if roles:
        db_session.add(
            InvestigationUserRole(
                user_id=user.id, investigation_id=investigation.id, roles=list(roles)
            )
        )
    db_session.commit()
    headers = {"Authorization": f"Bearer {create_access_token({'sub': user.email})}"}
    return headers, str(sketch.id)


def _launch(client, db_session, params=None, roles=(Role.OWNER,), sketch_id=None):
    headers, own_sketch_id = _seed_user(db_session, roles)
    body = {"node_ids": ["4:abc:1"], "sketch_id": sketch_id or own_sketch_id}
    if params is not None:
        body["params"] = params
    res = client.post("/api/enrichers/some_enricher/launch", json=body, headers=headers)
    return res, body["sketch_id"]


def test_launch_forwards_params_as_task_kwargs(client, db_session, sent_task):
    res, _ = _launch(client, db_session, params={"api_key": "abc123"})

    assert res.status_code == 200
    assert res.json() == {"id": "task-123"}
    assert sent_task["name"] == "run_enricher"
    assert sent_task["kwargs"] == {"params": {"api_key": "abc123"}}


def test_launch_without_params_sends_an_empty_dict(client, db_session, sent_task):
    res, _ = _launch(client, db_session)

    assert res.status_code == 200
    assert sent_task["kwargs"] == {"params": {}}


def test_launch_keeps_the_positional_args_unchanged(client, db_session, sent_task):
    _, sketch_id = _launch(client, db_session, params={"k": "v"})

    enricher_name, entities, sent_sketch_id, owner_id = sent_task["args"]
    assert enricher_name == "some_enricher"
    assert entities == [{"address": "8.8.8.8"}]
    assert sent_sketch_id == sketch_id
    assert uuid.UUID(owner_id)


def test_launch_succeeds_for_an_editor(client, db_session, sent_task):
    res, _ = _launch(client, db_session, roles=(Role.EDITOR,))

    assert res.status_code == 200


def test_launch_is_forbidden_without_a_role_on_the_investigation(
    client, db_session, sent_task
):
    res, _ = _launch(client, db_session, roles=())

    assert res.status_code == 403
    assert res.json()["detail"] == "Forbidden"
    assert sent_task == {}


def test_launch_is_forbidden_for_a_viewer(client, db_session, sent_task):
    res, _ = _launch(client, db_session, roles=(Role.VIEWER,))

    assert res.status_code == 403
    assert sent_task == {}


def test_launch_is_forbidden_against_another_users_sketch(
    client, db_session, sent_task
):
    _, victim_sketch_id = _seed_user(db_session, (Role.OWNER,))

    res, _ = _launch(client, db_session, sketch_id=victim_sketch_id)

    assert res.status_code == 403
    assert sent_task == {}


def test_launch_is_rejected_for_an_unknown_sketch(client, db_session, sent_task):
    res, _ = _launch(client, db_session, sketch_id=str(uuid.uuid4()))

    assert res.status_code == 404
    assert res.json()["detail"] == "Sketch not found"
    assert sent_task == {}


def test_launch_is_rejected_for_a_malformed_sketch_id(client, db_session, sent_task):
    res, _ = _launch(client, db_session, sketch_id="not-a-uuid")

    assert res.status_code == 404
    assert sent_task == {}
