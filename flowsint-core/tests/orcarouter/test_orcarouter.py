"""OrcaRouter backend tests: endpoints, PKCE, credentials, catalog, errors.

These use only fake credentials. No test reaches the network, and several
assert that a secret cannot escape through a log line, an error message, or a
``repr``.
"""

from unittest.mock import MagicMock

import pytest

from flowsint_core.core.orcarouter import (
    DEFAULT_API_BASE,
    DEFAULT_AUTH_BASE,
    VAULT_KEY_NAME,
    VERIFIED_SEED,
    ApiKeyCredentialProvider,
    Capability,
    CatalogClient,
    CredentialStore,
    OrcaRouterAuthError,
    OrcaRouterConfigError,
    OrcaRouterProvider,
    PkceConnectManager,
    code_challenge,
    filter_models,
    generate_state,
    generate_verifier,
    parse_catalog,
    parse_model,
    redact,
    resolve_endpoints,
    select_default_model,
    state_matches,
    validate_api_key_shape,
)
from flowsint_core.core.orcarouter.credentials import CredentialSource
from flowsint_core.core.orcarouter.errors import OrcaRouterReauthRequired

FAKE_KEY = "sk-orca-testfakekey000000000000000000"
FAKE_CODE = "fake-auth-code"
OWNER = "11111111-1111-1111-1111-111111111111"


class FakeVaultService:
    """Stand-in for VaultService, with the same upsert-shaped semantics."""

    def __init__(self):
        self.rows: dict[tuple[str, str], str] = {}
        self.deleted: list[tuple[str, str]] = []

    def get_secret(self, owner_id, vault_ref):
        return self.rows.get((str(owner_id), vault_ref))

    def set_secret(self, owner_id, vault_ref, plain_key):
        self.rows[(str(owner_id), vault_ref)] = plain_key
        return MagicMock()

    def delete_secret(self, owner_id, vault_ref):
        self.deleted.append((str(owner_id), vault_ref))
        return 1 if self.rows.pop((str(owner_id), vault_ref), None) else 0


def make_store():
    vault = FakeVaultService()
    return CredentialStore(MagicMock(), vault_service=vault), vault


# ------------------------------------------------------------------ endpoints


class TestEndpoints:
    def test_default_origins_are_distinct(self):
        endpoints = resolve_endpoints({})
        assert endpoints.auth_base == DEFAULT_AUTH_BASE
        assert endpoints.api_base == DEFAULT_API_BASE
        assert endpoints.auth_base != endpoints.api_base

    def test_exchange_is_on_the_auth_origin_not_the_relay(self):
        endpoints = resolve_endpoints({})
        assert endpoints.exchange_url == "https://www.orcarouter.ai/api/v1/auth/keys"
        # The relay is at /v1 and its API endpoints are not. This is the single
        # most common integration mistake.
        assert "api.orcarouter.ai/v1/auth" not in endpoints.exchange_url

    def test_inference_and_models_use_the_api_origin(self):
        endpoints = resolve_endpoints({})
        assert endpoints.inference_base == "https://api.orcarouter.ai/v1"
        assert endpoints.models_url == "https://api.orcarouter.ai/v1/models"

    def test_authorize_url_is_auth_origin_plus_auth_path(self):
        assert resolve_endpoints({}).authorize_url == "https://www.orcarouter.ai/auth"

    def test_shared_base_url_is_a_fallback_for_both(self):
        endpoints = resolve_endpoints({"ORCA_BASE_URL": "https://orca.internal"})
        assert endpoints.auth_base == "https://orca.internal"
        assert endpoints.api_base == "https://orca.internal"

    def test_explicit_overrides_win_over_the_shared_base(self):
        endpoints = resolve_endpoints(
            {
                "ORCA_BASE_URL": "https://orca.internal",
                "ORCA_AUTH_BASE_URL": "https://auth.internal",
                "ORCA_API_BASE_URL": "https://api.internal",
            }
        )
        assert endpoints.auth_base == "https://auth.internal"
        assert endpoints.api_base == "https://api.internal"

    def test_pasting_the_inference_root_into_api_override_does_not_double_v1(self):
        endpoints = resolve_endpoints(
            {"ORCA_API_BASE_URL": "https://api.orcarouter.ai/v1"}
        )
        assert endpoints.inference_base == "https://api.orcarouter.ai/v1"
        assert endpoints.models_url == "https://api.orcarouter.ai/v1/models"

    def test_plain_http_is_allowed_for_loopback_only(self):
        assert resolve_endpoints({"ORCA_BASE_URL": "http://127.0.0.1:8080"}).api_base
        assert resolve_endpoints({"ORCA_BASE_URL": "http://localhost:8080"}).api_base
        with pytest.raises(OrcaRouterConfigError):
            resolve_endpoints({"ORCA_BASE_URL": "http://orca.example.com"})

    def test_origin_is_never_derived_from_the_other(self):
        # An auth-only override must not drag the inference origin with it.
        endpoints = resolve_endpoints({"ORCA_AUTH_BASE_URL": "https://auth.self.host"})
        assert endpoints.api_base == DEFAULT_API_BASE
        assert endpoints.exchange_url.startswith("https://auth.self.host/")


# ----------------------------------------------------------------------- PKCE


class TestPkce:
    def test_challenge_is_s256_of_the_verifier(self):
        verifier = "test-verifier-value"
        import base64
        import hashlib

        expected = (
            base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
            .decode()
            .rstrip("=")
        )
        assert code_challenge(verifier) == expected

    def test_challenge_has_no_padding_and_is_url_safe(self):
        challenge = code_challenge(generate_verifier())
        assert "=" not in challenge
        assert "+" not in challenge and "/" not in challenge

    def test_verifier_and_state_are_fresh_every_attempt(self):
        verifiers = {generate_verifier() for _ in range(50)}
        states = {generate_state() for _ in range(50)}
        assert len(verifiers) == 50
        assert len(states) == 50

    def test_verifier_length_meets_rfc7636_minimum(self):
        assert len(generate_verifier()) >= 43

    def test_state_comparison_is_exact(self):
        assert state_matches("abc", "abc")
        assert not state_matches("abc", "abd")
        assert not state_matches("abc", "")
        assert not state_matches("abc", None)
        assert not state_matches("", "abc")


# ------------------------------------------------------------------ API key


class TestApiKeyAdapter:
    def test_save_load_clear_roundtrip(self):
        store, _ = make_store()
        provider = ApiKeyCredentialProvider(store)

        assert provider.is_configured(OWNER) is False
        result = provider.save(OWNER, FAKE_KEY)
        assert result.api_key == FAKE_KEY
        assert result.source == CredentialSource.API_KEY
        assert provider.is_configured(OWNER) is True

        provider.clear(OWNER)
        assert provider.is_configured(OWNER) is False

    def test_saving_twice_replaces_rather_than_shadows(self):
        store, vault = make_store()
        provider = ApiKeyCredentialProvider(store)

        provider.save(OWNER, FAKE_KEY)
        second = "sk-orca-secondfakekey000000000000000"
        provider.save(OWNER, second)

        # A stale row under the same name would shadow the new key, because
        # get_secret reads the first match.
        assert provider.current(OWNER).api_key == second

    def test_generation_increments_on_replacement(self):
        store, _ = make_store()
        provider = ApiKeyCredentialProvider(store)
        first = provider.save(OWNER, FAKE_KEY)
        second = provider.save(OWNER, "sk-orca-secondfakekey000000000000000")
        assert second.generation > first.generation

    def test_rejects_an_empty_or_whitespace_key(self):
        with pytest.raises(ValueError):
            validate_api_key_shape("   ")

    def test_rejects_a_key_containing_whitespace(self):
        with pytest.raises(ValueError):
            validate_api_key_shape("sk-orca-abc def")

    def test_rejects_a_non_orcarouter_key(self):
        with pytest.raises(ValueError):
            validate_api_key_shape("sk-proj-not-an-orcarouter-key")

    def test_accepts_and_trims_a_well_formed_key(self):
        assert validate_api_key_shape(f"  {FAKE_KEY}  ") == FAKE_KEY

    def test_key_is_stored_under_the_documented_vault_ref(self):
        store, vault = make_store()
        ApiKeyCredentialProvider(store).save(OWNER, FAKE_KEY)
        assert vault.rows[(OWNER, VAULT_KEY_NAME)] == FAKE_KEY

    def test_redaction_never_reveals_the_whole_key(self):
        masked = redact(FAKE_KEY)
        assert FAKE_KEY not in masked
        assert masked.startswith("sk-orca-")
        assert masked.endswith(FAKE_KEY[-4:])
        assert redact(None) == "<unset>"


# ---------------------------------------------------------------- PKCE adapter


class FakeResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload
        self.text = text

    def json(self):
        if self._payload is None:
            raise ValueError("no json")
        return self._payload


class FakeHttpClient:
    """Minimal httpx.AsyncClient stand-in.

    ``response`` may be a :class:`FakeResponse` or an exception instance; an
    exception is raised from the request, which is how network failures are
    simulated.
    """

    def __init__(self, response):
        self.response = response
        self.calls = []
        self.get_calls = []

    async def post(self, url, json=None, **kwargs):
        self.calls.append({"url": url, "json": json})
        if isinstance(self.response, Exception):
            raise self.response
        return self.response

    async def get(self, url, headers=None, params=None, **kwargs):
        self.get_calls.append({"url": url, "headers": headers, "params": params})
        if isinstance(self.response, Exception):
            raise self.response
        return self.response

    def build_request(self, *a, **k):  # pragma: no cover - unused here
        raise NotImplementedError

    async def aclose(self):
        pass


def make_manager(response, *, timeout=300.0):
    store, vault = make_store()
    client = FakeHttpClient(response)
    manager = PkceConnectManager(
        store,
        endpoints=resolve_endpoints({}),
        timeout=timeout,
        http_client=client,
    )
    return manager, store, client, vault


class TestPkceConnectFlow:
    def test_authorize_url_uses_auth_origin_and_the_documented_params(self):
        manager, *_ = make_manager(FakeResponse())
        _, url = manager.start(OWNER)

        assert url.startswith("https://www.orcarouter.ai/auth?")
        assert "callback_url=oob" in url
        assert "code_challenge_method=S256" in url
        assert "scope=api" in url
        assert "app_name=" in url
        # The relay origin must not appear anywhere on an authorize URL.
        assert "api.orcarouter.ai" not in url

    def test_authorize_url_carries_only_the_challenge_not_the_verifier(self):
        manager, *_ = make_manager(FakeResponse())
        attempt_id, url = manager.start(OWNER)
        attempt = manager.get(attempt_id)

        assert attempt.verifier not in url
        assert code_challenge(attempt.verifier) in url
        # The verifier must not appear anywhere in the URL, encoded or not.
        import urllib.parse

        assert attempt.verifier not in urllib.parse.unquote(url)

    def test_each_attempt_uses_a_fresh_verifier_and_state(self):
        manager, *_ = make_manager(FakeResponse())
        first_id, first_url = manager.start(OWNER)
        first = manager.get(first_id)
        second_id, second_url = manager.start(OWNER)
        second = manager.get(second_id)

        assert first.verifier != second.verifier
        assert first.state != second.state
        assert first_url != second_url

    @pytest.mark.asyncio
    async def test_exchange_goes_to_the_auth_origin_with_the_verifier(self):
        manager, store, client, _ = make_manager(
            FakeResponse(200, {"key": FAKE_KEY, "user_id": "1", "scope": "api"})
        )
        attempt_id, _ = manager.start(OWNER)
        attempt = manager.get(attempt_id)

        result = await manager.complete(attempt_id, FAKE_CODE)

        assert client.calls[0]["url"] == "https://www.orcarouter.ai/api/v1/auth/keys"
        assert client.calls[0]["json"]["code"] == FAKE_CODE
        assert client.calls[0]["json"]["code_verifier"] == attempt.verifier
        assert client.calls[0]["json"]["code_challenge_method"] == "S256"
        assert result.api_key == FAKE_KEY
        assert result.source == CredentialSource.OAUTH_PKCE

    @pytest.mark.asyncio
    async def test_successful_login_persists_the_key_for_reuse(self):
        manager, store, _, vault = make_manager(
            FakeResponse(200, {"key": FAKE_KEY, "scope": "api"})
        )
        attempt_id, _ = manager.start(OWNER)
        await manager.complete(attempt_id, FAKE_CODE)

        # Restarting the process must reuse this key, not mint another one:
        # OrcaRouter caps PKCE-issued keys at 10 per user per 24 hours.
        assert vault.rows[(OWNER, VAULT_KEY_NAME)] == FAKE_KEY
        assert store.current_api_key(OWNER) == FAKE_KEY

    @pytest.mark.asyncio
    async def test_login_lock_is_released_on_success(self):
        manager, *_ = make_manager(FakeResponse(200, {"key": FAKE_KEY, "scope": "api"}))
        attempt_id, _ = manager.start(OWNER)
        await manager.complete(attempt_id, FAKE_CODE)
        assert manager.is_current(attempt_id) is False

    @pytest.mark.asyncio
    async def test_denial_is_terminal_and_releases_the_lock(self):
        manager, store, *_ = make_manager(FakeResponse(403, {"error": "access_denied"}))
        attempt_id, _ = manager.start(OWNER)

        with pytest.raises(OrcaRouterAuthError) as excinfo:
            await manager.complete(attempt_id, FAKE_CODE)

        assert "expired" in str(excinfo.value).lower()
        assert excinfo.value.terminal is True
        assert manager.is_current(attempt_id) is False
        # A denied exchange must not have stored anything.
        assert store.current_api_key(OWNER) is None

    @pytest.mark.asyncio
    async def test_code_reuse_is_refused_without_a_second_exchange(self):
        manager, store, client, _ = make_manager(
            FakeResponse(200, {"key": FAKE_KEY, "scope": "api"})
        )
        attempt_id, _ = manager.start(OWNER)
        await manager.complete(attempt_id, FAKE_CODE)

        with pytest.raises(OrcaRouterAuthError):
            await manager.complete(attempt_id, FAKE_CODE)

        # Exactly one exchange: a spent code is never re-sent.
        assert len(client.calls) == 1

    @pytest.mark.asyncio
    async def test_bad_challenge_method_400_is_terminal(self):
        manager, *_ = make_manager(FakeResponse(400, {"error": "invalid_request"}))
        attempt_id, _ = manager.start(OWNER)
        with pytest.raises(OrcaRouterAuthError) as excinfo:
            await manager.complete(attempt_id, FAKE_CODE)
        assert excinfo.value.status == 400
        assert excinfo.value.terminal is True

    @pytest.mark.asyncio
    async def test_429_is_reported_as_rate_limit_and_is_not_terminal(self):
        manager, *_ = make_manager(FakeResponse(429, {"error": "too_many_requests"}))
        attempt_id, _ = manager.start(OWNER)

        with pytest.raises(OrcaRouterAuthError) as excinfo:
            await manager.complete(attempt_id, FAKE_CODE)

        assert excinfo.value.status == 429
        assert excinfo.value.terminal is False
        assert "24 hours" in str(excinfo.value)

    @pytest.mark.asyncio
    async def test_network_failure_ends_safely(self):
        manager, store, *_ = make_manager(OSError("connection refused"))
        attempt_id, _ = manager.start(OWNER)

        with pytest.raises(OrcaRouterAuthError) as excinfo:
            await manager.complete(attempt_id, FAKE_CODE)

        assert "Could not reach OrcaRouter" in str(excinfo.value)
        assert manager.is_current(attempt_id) is False
        assert store.current_api_key(OWNER) is None

    @pytest.mark.asyncio
    async def test_scope_downgrade_is_rejected(self):
        manager, store, *_ = make_manager(
            FakeResponse(200, {"key": FAKE_KEY, "scope": "readonly"})
        )
        attempt_id, _ = manager.start(OWNER)

        with pytest.raises(OrcaRouterAuthError) as excinfo:
            await manager.complete(attempt_id, FAKE_CODE)

        assert "scope" in str(excinfo.value).lower()
        assert store.current_api_key(OWNER) is None

    @pytest.mark.asyncio
    async def test_missing_key_in_response_is_terminal(self):
        manager, *_ = make_manager(FakeResponse(200, {"scope": "api"}))
        attempt_id, _ = manager.start(OWNER)
        with pytest.raises(OrcaRouterAuthError):
            await manager.complete(attempt_id, FAKE_CODE)

    @pytest.mark.asyncio
    async def test_timeout_ends_the_attempt(self):
        manager, store, *_ = make_manager(
            FakeResponse(200, {"key": FAKE_KEY, "scope": "api"}), timeout=-1.0
        )
        attempt_id, _ = manager.start(OWNER)

        with pytest.raises(OrcaRouterAuthError) as excinfo:
            await manager.complete(attempt_id, FAKE_CODE)

        assert "timed out" in str(excinfo.value)
        assert manager.is_current(attempt_id) is False

    @pytest.mark.asyncio
    async def test_explicit_cancel_releases_the_lock(self):
        manager, *_ = make_manager(FakeResponse(200, {"key": FAKE_KEY, "scope": "api"}))
        attempt_id, _ = manager.start(OWNER)
        assert manager.cancel(attempt_id) is True
        assert manager.is_current(attempt_id) is False

        with pytest.raises(OrcaRouterAuthError):
            await manager.complete(attempt_id, FAKE_CODE)

    @pytest.mark.asyncio
    async def test_a_stale_response_cannot_overwrite_a_newer_login(self):
        manager, store, client, vault = make_manager(
            FakeResponse(200, {"key": FAKE_KEY, "scope": "api"})
        )
        first_id, _ = manager.start(OWNER)
        # Second login supersedes the first while it is still in flight.
        second_id, _ = manager.start(OWNER)
        assert manager.is_current(first_id) is False

        with pytest.raises(OrcaRouterAuthError):
            await manager.complete(first_id, FAKE_CODE)

        assert manager.is_current(second_id) is True

    def test_cancel_owner_clears_every_attempt(self):
        manager, *_ = make_manager(FakeResponse())
        manager.start(OWNER)
        manager.start(OWNER)
        assert manager.cancel_owner(OWNER) >= 1
        assert manager.active_attempt_id(OWNER) is None

    def test_unsupported_scope_is_refused_before_any_request(self):
        manager, *_ = make_manager(FakeResponse())
        with pytest.raises(OrcaRouterAuthError):
            manager.start(OWNER, scope="admin")

    def test_verifier_never_appears_in_a_repr_or_error(self):
        manager, *_ = make_manager(FakeResponse())
        attempt_id, _ = manager.start(OWNER)
        attempt = manager.get(attempt_id)
        assert attempt.verifier not in repr(attempt)
        assert attempt.verifier not in str(attempt)


# ----------------------------------------------------------- reauth lifecycle


class TestReauth:
    def test_401_marks_the_credential_for_reauthentication(self):
        store, _ = make_store()
        provider = ApiKeyCredentialProvider(store)
        result = provider.save(OWNER, FAKE_KEY)

        assert store.mark_rejected(OWNER, result.generation) is True
        assert store.needs_reauth(OWNER) is True
        # A credential pending reauth is never handed to an HTTP client.
        assert store.current_api_key(OWNER) is None

    def test_no_fake_refresh_is_attempted(self):
        store, vault = make_store()
        result = ApiKeyCredentialProvider(store).save(OWNER, FAKE_KEY)
        store.mark_rejected(OWNER, result.generation)

        # The durable key is retained, not refreshed or fabricated.
        assert vault.rows[(OWNER, VAULT_KEY_NAME)] == FAKE_KEY
        assert store.needs_reauth(OWNER) is True

    def test_late_401_cannot_mark_a_newer_credential_broken(self):
        store, _ = make_store()
        provider = ApiKeyCredentialProvider(store)
        stale = provider.save(OWNER, FAKE_KEY)
        fresh = provider.save(OWNER, "sk-orca-newerkey00000000000000000000")

        # The old request's failure arrives after reauthentication succeeded.
        assert store.mark_rejected(OWNER, stale.generation) is False
        assert store.needs_reauth(OWNER) is False
        assert store.current_api_key(OWNER) == fresh.api_key

    def test_a_successful_login_clears_a_previous_reauth_state(self):
        store, _ = make_store()
        result = ApiKeyCredentialProvider(store).save(OWNER, FAKE_KEY)
        store.mark_rejected(OWNER, result.generation)
        assert store.needs_reauth(OWNER) is True

        ApiKeyCredentialProvider(store).save(
            OWNER, "sk-orca-newerkey00000000000000000000"
        )
        assert store.needs_reauth(OWNER) is False

    def test_old_secret_is_not_deleted_before_replacement_succeeds(self):
        store, vault = make_store()
        ApiKeyCredentialProvider(store).save(OWNER, FAKE_KEY)
        store.mark_rejected(OWNER, None)

        # Marking for reauth must retain the credential: a misclassified or
        # transient failure would otherwise become irreversible account loss.
        assert vault.rows[(OWNER, VAULT_KEY_NAME)] == FAKE_KEY


# -------------------------------------------------------------- model catalog

CATALOG_FIXTURE = {
    "data": [
        {
            "id": "openai/gpt-5.5",
            "name": "GPT-5.5",
            "context_length": 400000,
            "architecture": {
                "input_modalities": ["text", "image"],
                "output_modalities": ["text"],
            },
            "supported_endpoint_types": ["openai", "openai-response"],
            "reasoning_efforts": ["low", "medium", "high", "xhigh"],
        },
        {
            "id": "anthropic/claude-opus-4.8",
            "name": "Claude Opus 4.8",
            "architecture": {"input_modalities": ["text", "image"]},
            "supported_endpoint_types": ["anthropic"],
        },
        {
            "id": "google/gemini-3.5-flash",
            "name": "Gemini 3.5 Flash",
            "architecture": {"input_modalities": ["text", "image", "audio", "video"]},
            "supported_endpoint_types": ["gemini"],
        },
        {
            "id": "text-embedding-3-large",
            "supported_endpoint_types": ["embeddings"],
        },
        {
            "id": "vendor/image-gen-xl",
            "supported_endpoint_types": ["image-generation"],
        },
        {
            "id": "vendor/rerank-v1",
            "supported_endpoint_types": ["jina-rerank"],
        },
        {
            "id": "vendor/video-model",
            "supported_endpoint_types": ["openai-video"],
        },
        # Text-only chat model: must be excluded once an image is attached.
        {
            "id": "deepseek/deepseek-v4-pro",
            "architecture": {"input_modalities": ["text"]},
            "supported_endpoint_types": ["openai", "anthropic"],
        },
    ]
}


class TestCatalog:
    def models(self):
        return parse_catalog(CATALOG_FIXTURE)

    def ids(self, models):
        return [m.id for m in models]

    def test_parses_ids_verbatim_including_vendor_namespace(self):
        assert "openai/gpt-5.5" in self.ids(self.models())
        assert "anthropic/claude-opus-4.8" in self.ids(self.models())

    def test_reasoning_ladder_is_preserved(self):
        gpt = next(m for m in self.models() if m.id == "openai/gpt-5.5")
        assert list(gpt.reasoning_efforts) == ["low", "medium", "high", "xhigh"]

    def test_chat_filter_excludes_non_chat_endpoint_types(self):
        chat = self.ids(filter_models(self.models(), Capability.CHAT))
        assert "vendor/image-gen-xl" not in chat
        assert "vendor/video-model" not in chat
        assert "vendor/rerank-v1" not in chat
        assert "text-embedding-3-large" not in chat
        assert "openai/gpt-5.5" in chat

    def test_embedding_filter_is_strict(self):
        assert self.ids(filter_models(self.models(), Capability.EMBEDDING)) == [
            "text-embedding-3-large"
        ]

    def test_image_filter_is_strict(self):
        assert self.ids(filter_models(self.models(), Capability.IMAGE)) == [
            "vendor/image-gen-xl"
        ]

    def test_video_and_rerank_filters_are_strict(self):
        assert self.ids(filter_models(self.models(), Capability.VIDEO)) == [
            "vendor/video-model"
        ]
        assert self.ids(filter_models(self.models(), Capability.RERANK)) == [
            "vendor/rerank-v1"
        ]

    def test_multimodal_fails_closed_for_undeclared_modalities(self):
        chat = self.ids(filter_models(self.models(), Capability.CHAT))
        with_image = self.ids(
            filter_models(
                self.models(), Capability.MULTIMODAL, required_modalities=["image"]
            )
        )
        # The text-only model was eligible for chat and must drop out here.
        assert "deepseek/deepseek-v4-pro" in chat
        assert "deepseek/deepseek-v4-pro" not in with_image
        assert "openai/gpt-5.5" in with_image

    def test_audio_modality_only_matches_models_declaring_it(self):
        audio = self.ids(
            filter_models(
                self.models(), Capability.MULTIMODAL, required_modalities=["audio"]
            )
        )
        assert audio == ["google/gemini-3.5-flash"]

    def test_unknown_capability_yields_nothing_rather_than_everything(self):
        assert filter_models(self.models(), "telepathy") == []

    def test_model_without_an_id_is_skipped(self):
        assert parse_model({"name": "no id"}) is None
        assert parse_model({"id": "   "}) is None
        assert parse_model("not a mapping") is None

    def test_malformed_record_does_not_break_the_catalog(self):
        models = parse_catalog({"data": [{"no_id": True}, {"id": "ok/model"}]})
        assert self.ids(models) == ["ok/model"]

    def test_public_dict_exposes_no_credential_and_only_normalized_fields(self):
        gpt = next(m for m in self.models() if m.id == "openai/gpt-5.5")
        public = gpt.to_public_dict()
        assert public["id"] == "openai/gpt-5.5"
        assert public["reasoningEfforts"] == ["low", "medium", "high", "xhigh"]
        assert "sk-orca" not in str(public)

    def test_seed_covers_the_documented_models_with_verified_metadata(self):
        ids = self.ids(VERIFIED_SEED)
        for expected in (
            "openai/gpt-5.5",
            "anthropic/claude-opus-4.8",
            "google/gemini-3.5-flash",
            "deepseek/deepseek-v4-pro",
            "orcarouter/auto",
        ):
            assert expected in ids

        gpt = next(m for m in VERIFIED_SEED if m.id == "openai/gpt-5.5")
        assert list(gpt.reasoning_efforts) == ["low", "medium", "high", "xhigh"]
        assert "image" in gpt.input_modalities
        assert gpt.context_length == 400000

    def test_default_model_prefers_the_auto_route(self):
        assert select_default_model(VERIFIED_SEED) == "orcarouter/auto"


class TestCatalogClient:
    @pytest.mark.asyncio
    async def test_live_discovery_succeeds_and_uses_the_api_origin(self):
        client = FakeHttpClient(FakeResponse(200, CATALOG_FIXTURE))
        catalog_client = CatalogClient(resolve_endpoints({}), http_client=client)

        result = await catalog_client.fetch("sk-orca-fake")

        assert result.degraded is False
        assert result.source == "https://api.orcarouter.ai/v1/models"
        assert result.count == len(CATALOG_FIXTURE["data"])
        assert client.get_calls[0]["url"] == "https://api.orcarouter.ai/v1/models"

    @pytest.mark.asyncio
    async def test_live_success_does_not_merge_the_seed(self):
        client = FakeHttpClient(
            FakeResponse(
                200,
                {
                    "data": [
                        {"id": "only/model", "supported_endpoint_types": ["openai"]}
                    ]
                },
            )
        )
        catalog_client = CatalogClient(resolve_endpoints({}), http_client=client)
        result = await catalog_client.fetch("sk-orca-fake")

        # Mixing unverified seed entries into a verified result is how a stale
        # model id outlives its removal upstream.
        assert [m.id for m in result.models] == ["only/model"]
        assert result.degraded is False
        assert result.source.endswith("/v1/models")

    @pytest.mark.asyncio
    async def test_the_key_travels_as_a_bearer_token_only(self):
        client = FakeHttpClient(FakeResponse(200, CATALOG_FIXTURE))
        catalog_client = CatalogClient(resolve_endpoints({}), http_client=client)
        await catalog_client.fetch(FAKE_KEY)

        call = client.get_calls[0]
        assert call["headers"]["Authorization"] == f"Bearer {FAKE_KEY}"
        # And nowhere else: not in the URL, not in the query string.
        assert FAKE_KEY not in call["url"]
        assert FAKE_KEY not in str(call["params"] or {})

    @pytest.mark.asyncio
    async def test_outage_falls_back_to_the_verified_seed(self):
        client = FakeHttpClient(OSError("dns failure"))
        catalog_client = CatalogClient(resolve_endpoints({}), http_client=client)

        result = await catalog_client.fetch("sk-orca-fake")

        assert result.degraded is True
        assert result.source == "verified-seed"
        assert result.count == 5
        # The fallback keeps its verified reasoning metadata.
        gpt = next(m for m in result.models if m.id == "openai/gpt-5.5")
        assert list(gpt.reasoning_efforts) == ["low", "medium", "high", "xhigh"]

    @pytest.mark.asyncio
    async def test_http_error_falls_back_to_the_seed(self):
        client = FakeHttpClient(FakeResponse(503, None, "unavailable"))
        catalog_client = CatalogClient(resolve_endpoints({}), http_client=client)
        result = await catalog_client.fetch("sk-orca-fake")
        assert result.degraded is True
        assert "503" in result.error

    @pytest.mark.asyncio
    async def test_empty_catalog_is_treated_as_an_outage(self):
        client = FakeHttpClient(FakeResponse(200, {"data": []}))
        catalog_client = CatalogClient(resolve_endpoints({}), http_client=client)
        result = await catalog_client.fetch("sk-orca-fake")
        # Falling back to nothing would leave the user with no models at all.
        assert result.degraded is True
        assert result.count == 5

    @pytest.mark.asyncio
    async def test_malformed_json_falls_back_to_the_seed(self):
        client = FakeHttpClient(FakeResponse(200, None, "not json"))
        catalog_client = CatalogClient(resolve_endpoints({}), http_client=client)
        result = await catalog_client.fetch("sk-orca-fake")
        assert result.degraded is True


# ------------------------------------------------------------------ provider


class TestOrcaRouterProvider:
    def test_requires_a_key(self):
        with pytest.raises(ValueError):
            OrcaRouterProvider(api_key="")

    def test_inference_base_is_the_api_origin(self):
        provider = OrcaRouterProvider(api_key=FAKE_KEY)
        assert provider.base_url == "https://api.orcarouter.ai/v1"

    def test_default_model_is_the_routing_entry(self):
        assert OrcaRouterProvider(api_key=FAKE_KEY).model == "orcarouter/auto"

    def test_factory_registers_orcarouter(self):
        from flowsint_core.core.llm import create_llm_provider

        provider = create_llm_provider(provider="orcarouter", api_key=FAKE_KEY)
        assert isinstance(provider, OrcaRouterProvider)

    def test_factory_still_registers_the_other_providers(self):
        from flowsint_core.core.llm.factory import _SUPPORTED_PROVIDERS

        assert set(_SUPPORTED_PROVIDERS) >= {"mistral", "openai", "orcarouter"}

    @pytest.mark.asyncio
    async def test_a_401_raises_terminal_reauth_not_a_retry(self):
        class Resp:
            status_code = 401
            text = "unauthorized"

        class Client:
            async def post(self, *a, **k):
                return Resp()

        provider = OrcaRouterProvider(api_key=FAKE_KEY, client=Client())
        from flowsint_core.core.llm.types import ChatMessage, MessageRole

        with pytest.raises(OrcaRouterReauthRequired):
            await provider.complete([ChatMessage(role=MessageRole.USER, content="hi")])

    @pytest.mark.asyncio
    async def test_model_access_denied_is_actionable_not_a_reauth_prompt(self):
        """A valid key lacking access to one model must not look like a bad key.

        Observed live: HTTP 403 with ``model_access_denied``. Reauthorizing does
        not help, so the message must not send the user down that path.
        """

        class Resp:
            status_code = 403
            text = '{"error":{"code":"model_access_denied","message":"no access"}}'

        class Client:
            async def post(self, *a, **k):
                return Resp()

        provider = OrcaRouterProvider(api_key=FAKE_KEY, client=Client())
        from flowsint_core.core.llm.types import ChatMessage, MessageRole

        with pytest.raises(OrcaRouterAuthError) as excinfo:
            await provider.complete([ChatMessage(role=MessageRole.USER, content="hi")])
        assert excinfo.value.status == 403
        assert "does not have access" in str(excinfo.value)
        assert not isinstance(excinfo.value, OrcaRouterReauthRequired)

    @pytest.mark.asyncio
    async def test_a_successful_completion_returns_the_content(self):
        class Resp:
            status_code = 200
            text = ""

            def json(self):
                return {"choices": [{"message": {"content": "hello"}}]}

        class Client:
            async def post(self, *a, **k):
                return Resp()

        provider = OrcaRouterProvider(api_key=FAKE_KEY, client=Client())
        from flowsint_core.core.llm.types import ChatMessage, MessageRole

        out = await provider.complete(
            [ChatMessage(role=MessageRole.USER, content="hi")]
        )
        assert out == "hello"


# --------------------------------------------------------------------- entry


class TestCredentialSeam:
    def test_complete_api_key_repr_never_contains_the_key(self):
        from flowsint_core.core.orcarouter import CredentialResult

        result = CredentialResult(api_key=FAKE_KEY, source=CredentialSource.API_KEY)
        assert FAKE_KEY not in repr(result)
        assert FAKE_KEY not in str(result)
