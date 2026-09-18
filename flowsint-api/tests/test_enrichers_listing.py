"""Contract for GET /api/enrichers: template rows advertise their params."""

import uuid

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
