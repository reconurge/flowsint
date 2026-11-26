"""Contract for POST /api/enrichers/templates/generate when no LLM key is set."""

import uuid

from flowsint_core.core.auth import create_access_token
from flowsint_core.core.models import Profile


def _auth_headers(db_session):
    user = Profile(id=uuid.uuid4(), email="user@example.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    return {"Authorization": f"Bearer {create_access_token({'sub': user.email})}"}


def test_generate_without_llm_api_key_returns_422(client, db_session, monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "mistral")
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)
    headers = _auth_headers(db_session)

    res = client.post(
        "/api/enrichers/templates/generate",
        json={"prompt": "Look up a username on GitHub"},
        headers=headers,
    )

    assert res.status_code == 422
    assert "MISTRAL_API_KEY" in res.json()["detail"]
