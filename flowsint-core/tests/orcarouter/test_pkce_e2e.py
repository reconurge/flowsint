"""End-to-end PKCE test against a real local auth server.

The unit tests in ``test_orcarouter.py`` drive the connect manager with a fake
HTTP client. This one stands up an actual loopback HTTP server and runs the
implemented adapter against it over real sockets, so the whole path is exercised
— authorize URL construction, the exchange request body, the response parse,
and persistence — rather than a hand-fed return value.

The verifier is asserted to reach the *server* and to appear nowhere else: not
in the authorize URL, not in any log line.
"""

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import MagicMock

import pytest

from flowsint_core.core.orcarouter import (
    CredentialStore,
    OrcaRouterAuthError,
    OrcaRouterEndpoints,
    PkceConnectManager,
    code_challenge,
)
from flowsint_core.core.orcarouter.config import AUTHORIZE_PATH, EXCHANGE_PATH
from flowsint_core.core.orcarouter.credentials import CredentialSource

FAKE_KEY = "sk-orca-e2efakekey0000000000000000000"
FAKE_CODE = "e2e-one-time-code"
OWNER = "22222222-2222-2222-2222-222222222222"

#: Records everything the server saw, so the test can assert on the wire format.
CAPTURED: dict[str, list] = {"requests": [], "authorize_queries": []}


class _AuthHandler(BaseHTTPRequestHandler):
    """A minimal stand-in for the OrcaRouter auth origin."""

    def log_message(self, *args):  # silence the default stderr access log
        pass

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length).decode("utf-8") if length else ""
        try:
            body = json.loads(raw) if raw else {}
        except ValueError:
            body = {"_raw": raw}

        CAPTURED["requests"].append(
            {"path": self.path, "body": body, "auth": self.headers.get("Authorization")}
        )

        if self.path == EXCHANGE_PATH:
            submitted = body.get("code_verifier", "")
            expected = code_challenge(submitted)
            if self.server.expected_challenge != expected:
                # This is the PKCE check the real service performs.
                self.send_response(403)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "invalid_grant"}).encode())
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(
                json.dumps(
                    {
                        "key": FAKE_KEY,
                        "user_id": "42",
                        "scope": body.get("scope", "api"),
                    }
                ).encode()
            )
            return

        self.send_response(404)
        self.end_headers()


class _Server(HTTPServer):
    expected_challenge = None


@pytest.fixture
def auth_server():
    """A real HTTP server on loopback, standing in for the auth origin."""
    server = _Server(("127.0.0.1", 0), _AuthHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield server
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


class FakeVaultService:
    def __init__(self):
        self.rows = {}

    def get_secret(self, owner_id, vault_ref):
        return self.rows.get((str(owner_id), vault_ref))

    def set_secret(self, owner_id, vault_ref, plain_key):
        self.rows[(str(owner_id), vault_ref)] = plain_key
        return MagicMock()

    def delete_secret(self, owner_id, vault_ref):
        return 1 if self.rows.pop((str(owner_id), vault_ref), None) else 0


def make_manager(server, *, challenge_from=None):
    """Wire the real adapter at the local server.

    ``challenge_from`` lets a test pre-seed the challenge the server expects, so
    a mismatch can be forced.
    """
    port = server.server_address[1]
    endpoints = OrcaRouterEndpoints(
        auth_base=f"http://127.0.0.1:{port}",
        api_base=f"http://127.0.0.1:{port}",
    )
    vault = FakeVaultService()
    store = CredentialStore(MagicMock(), vault_service=vault)
    manager = PkceConnectManager(store, endpoints=endpoints, timeout=30.0)
    if challenge_from is not None:
        server.expected_challenge = challenge_from
    return manager, store, vault


@pytest.mark.asyncio
async def test_full_pkce_flow_over_real_http(auth_server):
    """authorize -> code -> exchange -> persist, over a real socket."""
    CAPTURED["requests"].clear()
    manager, store, vault = make_manager(auth_server)

    attempt_id, authorize_url = manager.start(OWNER)
    attempt = manager.get(attempt_id)

    # The server is told which challenge to expect, exactly as the real consent
    # service would have recorded it from the authorize request.
    auth_server.expected_challenge = code_challenge(attempt.verifier)

    # The verifier must not be on the authorize URL.
    assert attempt.verifier not in authorize_url
    assert code_challenge(attempt.verifier) in authorize_url
    assert authorize_url.startswith(f"http://127.0.0.1:{auth_server.server_address[1]}")
    assert f"{AUTHORIZE_PATH}?" in authorize_url

    result = await manager.complete(attempt_id, FAKE_CODE)

    # Persisted, and reusable.
    assert result.api_key == FAKE_KEY
    assert result.source == CredentialSource.OAUTH_PKCE
    assert vault.rows[(OWNER, "ORCAROUTER_API_KEY")] == FAKE_KEY
    assert store.current_api_key(OWNER) == FAKE_KEY

    # The exchange hit the auth path with the S256 challenge method and the
    # verifier in the body (never the URL).
    exchange = CAPTURED["requests"][-1]
    assert exchange["path"] == EXCHANGE_PATH
    assert exchange["body"]["code"] == FAKE_CODE
    assert exchange["body"]["code_verifier"] == attempt.verifier
    assert exchange["body"]["code_challenge_method"] == "S256"
    assert attempt.verifier not in exchange["path"]


@pytest.mark.asyncio
async def test_a_wrong_verifier_is_rejected_by_the_server(auth_server):
    """If the verifier does not match the stored challenge, the exchange fails.

    This is the property that makes PKCE safe without a client secret.
    """
    manager, store, _ = make_manager(auth_server)
    attempt_id, _ = manager.start(OWNER)

    # The server expects a challenge for a different verifier — simulating an
    # interceptor trying to redeem a stolen code without the original verifier.
    auth_server.expected_challenge = code_challenge("a-different-verifier")

    with pytest.raises(OrcaRouterAuthError):
        await manager.complete(attempt_id, FAKE_CODE)

    assert store.current_api_key(OWNER) is None
    assert manager.is_current(attempt_id) is False


@pytest.mark.asyncio
async def test_a_reused_code_is_refused(auth_server):
    manager, _, _ = make_manager(auth_server)
    attempt_id, _ = manager.start(OWNER)
    attempt = manager.get(attempt_id)
    auth_server.expected_challenge = code_challenge(attempt.verifier)

    await manager.complete(attempt_id, FAKE_CODE)
    before = len(CAPTURED["requests"])

    with pytest.raises(OrcaRouterAuthError):
        await manager.complete(attempt_id, FAKE_CODE)

    # No second exchange request was made for the spent code.
    assert len(CAPTURED["requests"]) == before


@pytest.mark.asyncio
async def test_authorize_only_ever_targets_the_auth_origin(auth_server):
    """The inference origin is never used for authorization."""
    inference_seen = []

    class Recorder:
        def __init__(self, inner):
            self._inner = inner

        def build_request(self, *a, **k):
            return self._inner.build_request(*a, **k)

        async def send(self, *a, **k):
            return await self._inner.send(*a, **k)

        async def post(self, url, **kwargs):
            inference_seen.append(url)
            return await self._inner.post(url, **kwargs)

        async def aclose(self):
            pass

    import httpx

    manager, _, _ = make_manager(auth_server)
    attempt_id, url = manager.start(OWNER)
    attempt = manager.get(attempt_id)
    auth_server.expected_challenge = code_challenge(attempt.verifier)

    inner = httpx.AsyncClient(timeout=10)
    manager._http_client = Recorder(inner)
    try:
        await manager.complete(attempt_id, FAKE_CODE)
    finally:
        await inner.aclose()

    assert all("/api/v1/auth/keys" in u for u in inference_seen), inference_seen
    assert not any("/v1/auth/keys" in u and "/api/v1" not in u for u in inference_seen)
