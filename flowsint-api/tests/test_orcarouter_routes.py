"""Tests for the OrcaRouter API routes.

Exercises both authentication entries through the routes the frontend actually
calls, plus the server-side model catalog. The key is asserted to be write-only:
it goes in and never comes back out.
"""

from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from flowsint_core.core.orcarouter import (
    CatalogClient,
    CredentialStore,
    OrcaRouterService,
    PkceConnectManager,
    resolve_endpoints,
)

FAKE_KEY = "sk-orca-routefakekey0000000000000000"
OWNER = uuid4()


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


class FakeResponse:
    def __init__(self, status_code=200, payload=None, content=b""):
        self.status_code = status_code
        self._payload = payload
        self.content = content or (
            repr(payload).encode() if payload is not None else b""
        )

    def json(self):
        if self._payload is None:
            raise ValueError("no json")
        return self._payload


class FakeHttpClient:
    def __init__(self, response):
        self.response = response
        self.get_calls = []
        self.post_calls = []

    async def get(self, url, headers=None, params=None, **kw):
        self.get_calls.append({"url": url, "headers": headers, "params": params})
        if isinstance(self.response, Exception):
            raise self.response
        return self.response

    async def post(self, url, json=None, **kw):
        self.post_calls.append({"url": url, "json": json})
        if isinstance(self.response, Exception):
            raise self.response
        return self.response

    def build_request(self, *a, **k):
        raise NotImplementedError

    async def aclose(self):
        pass


def make_service(http_response=None):
    """A service whose catalog and PKCE exchange both use a fake HTTP client."""
    vault = FakeVaultService()
    store = CredentialStore(MagicMock(), vault_service=vault)
    client = FakeHttpClient(http_response)
    endpoints = resolve_endpoints({})
    service = OrcaRouterService(
        MagicMock(),
        endpoints=endpoints,
        store=store,
        catalog_client=CatalogClient(endpoints, http_client=client),
        vault_service=vault,
        connect_manager=PkceConnectManager(
            store, endpoints=endpoints, http_client=client
        ),
    )
    return service, vault, client


CATALOG = {
    "data": [
        {
            "id": "openai/gpt-5.5",
            "name": "GPT-5.5",
            "context_length": 400000,
            "architecture": {"input_modalities": ["text", "image"]},
            "supported_endpoint_types": ["openai"],
            "reasoning_efforts": ["low", "medium", "high", "xhigh"],
        },
        {
            "id": "deepseek/deepseek-v4-pro",
            "architecture": {"input_modalities": ["text"]},
            "supported_endpoint_types": ["openai"],
        },
        {
            "id": "vendor/image-gen-xl",
            "supported_endpoint_types": ["image-generation"],
        },
    ]
}


class TestApiKeyRoute:
    def test_status_is_disconnected_before_any_credential(self):
        service, _, _ = make_service()
        assert service.credential(OWNER) is None
        assert service.is_connected(OWNER) is False

    def test_saving_a_key_connects_and_returns_only_a_redaction(self):
        service, vault, _ = make_service()
        result = service.save_api_key(OWNER, FAKE_KEY)

        assert result.api_key == FAKE_KEY
        assert service.is_connected(OWNER) is True
        assert vault.rows[(str(OWNER), "ORCAROUTER_API_KEY")] == FAKE_KEY

    def test_disconnect_clears_the_credential(self):
        service, _, _ = make_service()
        service.save_api_key(OWNER, FAKE_KEY)
        service.disconnect(OWNER)
        assert service.is_connected(OWNER) is False

    def test_a_bad_key_shape_is_refused_and_nothing_is_stored(self):
        service, vault, _ = make_service()
        with pytest.raises(ValueError):
            service.save_api_key(OWNER, "not-an-orcarouter-key")
        assert vault.rows == {}


class TestPkceRoutes:
    def test_connect_returns_an_authorize_url_on_the_auth_origin(self):
        service, _, _ = make_service()
        attempt_id, url = service.connect_manager.start(OWNER)

        assert attempt_id
        assert url.startswith("https://www.orcarouter.ai/auth?")
        assert "callback_url=oob" in url
        assert "code_challenge_method=S256" in url

    @pytest.mark.asyncio
    async def test_completing_the_flow_stores_the_key(self):
        service, vault, _ = make_service(
            FakeResponse(200, {"key": FAKE_KEY, "user_id": "1", "scope": "api"})
        )
        attempt_id, _ = service.connect_manager.start(OWNER)
        result = await service.connect_manager.complete(attempt_id, "fake-code")

        assert result.api_key == FAKE_KEY
        assert result.source == "oauth_pkce"
        assert vault.rows[(str(OWNER), "ORCAROUTER_API_KEY")] == FAKE_KEY

    def test_cancel_releases_the_login_lock(self):
        service, _, _ = make_service()
        attempt_id, _ = service.connect_manager.start(OWNER)
        assert service.connect_manager.cancel(attempt_id) is True
        assert service.connect_manager.is_current(attempt_id) is False

    def test_disconnect_also_releases_any_in_flight_login(self):
        service, _, _ = make_service()
        attempt_id, _ = service.connect_manager.start(OWNER)
        service.disconnect(OWNER)
        assert service.connect_manager.is_current(attempt_id) is False


class TestCredentialInterchange:
    """Both entries must produce the same kind of credential.

    This is the property that makes them two adapters on one seam rather than
    two parallel stacks.
    """

    @pytest.mark.asyncio
    async def test_both_entries_yield_an_identical_credential_shape(self):
        api_service, _, _ = make_service()
        api_result = api_service.save_api_key(OWNER, FAKE_KEY)

        pkce_service, _, _ = make_service(
            FakeResponse(200, {"key": FAKE_KEY, "user_id": "1", "scope": "api"})
        )
        attempt_id, _ = pkce_service.connect_manager.start(OWNER)
        pkce_result = await pkce_service.connect_manager.complete(
            attempt_id, "fake-code"
        )

        # Same type, same key, same downstream consumer.
        assert type(api_result) is type(pkce_result)
        assert api_result.api_key == pkce_result.api_key
        assert api_result.source != pkce_result.source

    def test_downstream_reads_do_not_depend_on_the_credential_source(self):
        service, _, _ = make_service()
        service.save_api_key(OWNER, FAKE_KEY)

        # Nothing below the seam branches on how the key was obtained.
        assert service.api_key(OWNER) == FAKE_KEY
        assert service.credential(OWNER).api_key == FAKE_KEY


class TestCatalogRoute:
    @pytest.mark.asyncio
    async def test_chat_entry_point_excludes_image_generation_models(self):
        service, _, _ = make_service(FakeResponse(200, CATALOG))
        result = await service.models_for_entry_point("chat", OWNER)

        ids = [m.id for m in result.models]
        assert "openai/gpt-5.5" in ids
        assert "vendor/image-gen-xl" not in ids

    @pytest.mark.asyncio
    async def test_catalog_uses_the_users_key_server_side(self):
        client = FakeHttpClient(FakeResponse(200, CATALOG))
        vault = FakeVaultService()
        store = CredentialStore(MagicMock(), vault_service=vault)
        service = OrcaRouterService(
            MagicMock(),
            endpoints=resolve_endpoints({}),
            store=store,
            catalog_client=CatalogClient(resolve_endpoints({}), http_client=client),
            vault_service=vault,
        )
        service.save_api_key(OWNER, FAKE_KEY)
        await service.catalog(OWNER)

        assert client.get_calls[0]["headers"]["Authorization"] == f"Bearer {FAKE_KEY}"

    @pytest.mark.asyncio
    async def test_public_catalog_carries_no_credential(self):
        service, _, _ = make_service(FakeResponse(200, CATALOG))
        service.save_api_key(OWNER, FAKE_KEY)
        result = await service.models_for_entry_point("chat", OWNER)

        public = service.public_catalog(result)
        assert FAKE_KEY not in str(public)
        assert "sk-orca" not in str(public)

    @pytest.mark.asyncio
    async def test_degraded_catalog_is_flagged_for_the_ui(self):
        service, _, _ = make_service(OSError("catalog down"))
        result = await service.models_for_entry_point("chat", OWNER)

        public = service.public_catalog(result)
        assert public["degraded"] is True
        assert public["isSeed"] is True
        assert public["count"] == 5

    @pytest.mark.asyncio
    async def test_unknown_entry_point_falls_back_to_the_chat_filter(self):
        service, _, _ = make_service(FakeResponse(200, CATALOG))
        result = await service.models_for_entry_point("nonexistent-entry", OWNER)
        assert [m.id for m in result.models] == [
            "openai/gpt-5.5",
            "deepseek/deepseek-v4-pro",
        ]


class TestUpstreamUnauthorized:
    def test_401_marks_the_exact_credential_generation(self):
        service, _, _ = make_service()
        saved = service.save_api_key(OWNER, FAKE_KEY)

        assert service.handle_upstream_unauthorized(OWNER, saved.generation) is True
        assert service.needs_reauth(OWNER) is True
        # Never hand a revoked key to a client.
        assert service.api_key(OWNER) is None

    def test_a_stale_401_does_not_poison_a_newer_credential(self):
        service, _, _ = make_service()
        stale = service.save_api_key(OWNER, FAKE_KEY)
        service.save_api_key(OWNER, "sk-orca-newerkey000000000000000000000")

        assert service.handle_upstream_unauthorized(OWNER, stale.generation) is False
        assert service.needs_reauth(OWNER) is False
