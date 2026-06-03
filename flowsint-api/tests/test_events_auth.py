"""Auth and shape contract for the SSE event endpoints."""

import importlib

import pytest

from flowsint_core.core.auth import create_access_token
from flowsint_core.core.models import Profile


def test_get_current_user_sse_is_removed():
    """The query-param SSE auth helper must no longer exist."""
    deps = importlib.import_module("app.api.deps")
    assert not hasattr(deps, "get_current_user_sse")


def test_log_stream_requires_auth_header(client):
    """No Authorization header -> 401 (no token in URL accepted)."""
    res = client.get("/api/events/sketch/abc/stream")
    assert res.status_code == 401


def test_status_stream_requires_auth_header(client):
    res = client.get("/api/events/sketch/abc/status/stream")
    assert res.status_code == 401


def test_log_stream_rejects_token_query_param(client):
    """A token in the URL must NOT authenticate the request anymore."""
    token = create_access_token({"sub": "user@example.com"})
    res = client.get(f"/api/events/sketch/abc/stream?token={token}")
    assert res.status_code == 401


def test_dead_scan_stream_endpoint_removed(client):
    """The unused scan status stream endpoint must be gone."""
    res = client.get("/api/events/status/scan/abc/stream")
    assert res.status_code == 404


def test_get_current_user_accepts_valid_bearer(db_session):
    """The dependency the streams now use authenticates via a valid JWT."""
    from app.api.deps import get_current_user

    db_session.add(Profile(email="user@example.com", hashed_password="x"))
    db_session.commit()

    token = create_access_token({"sub": "user@example.com"})
    user = get_current_user(token=token, db=db_session)
    assert user.email == "user@example.com"
