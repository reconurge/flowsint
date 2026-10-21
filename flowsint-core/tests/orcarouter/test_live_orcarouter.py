"""Live OrcaRouter checks through the implemented provider.

These are the only tests in the suite that touch the network, and they only run
when ``ORCAROUTER_API_KEY`` is present — a normal checkout without credentials
skips them rather than failing.

Both checks go through the code this integration adds, never a bare ``curl``:
the catalog check uses :class:`CatalogClient`, and the inference check uses
``create_llm_provider(provider="orcarouter")`` — the same factory the chat
assistant and the template generator call. A 200 from an ad-hoc HTTP request
would not prove the integration is wired up.
"""

import os

import pytest

from flowsint_core.core.llm import create_llm_provider
from flowsint_core.core.llm.types import ChatMessage, MessageRole
from flowsint_core.core.orcarouter import (
    Capability,
    CatalogClient,
    OrcaRouterAuthError,
    OrcaRouterReauthRequired,
    filter_models,
    resolve_endpoints,
)

pytestmark = pytest.mark.skipif(
    not os.environ.get("ORCAROUTER_API_KEY"),
    reason="ORCAROUTER_API_KEY is not set; live checks are opt-in",
)


def api_key() -> str:
    return os.environ["ORCAROUTER_API_KEY"]


@pytest.mark.asyncio
async def test_live_catalog_is_reachable_and_authoritative():
    """``GET /v1/models`` on the configured API origin returns a real catalog."""
    endpoints = resolve_endpoints()
    assert endpoints.models_url == "https://api.orcarouter.ai/v1/models"

    result = await CatalogClient(endpoints).fetch(api_key())

    # A degraded result here means the fallback ran — that is a failure for a
    # live check, not a pass.
    assert result.degraded is False, f"live catalog failed: {result.error}"
    assert result.count > 0
    assert result.source == endpoints.models_url

    # Model ids keep their vendor namespace verbatim.
    assert all("/" in model.id for model in result.models), [
        m.id for m in result.models
    ]


@pytest.mark.asyncio
async def test_live_chat_dropdown_only_contains_compatible_models():
    """The filtered chat list contains only models the adapter can speak to."""
    result = await CatalogClient(resolve_endpoints()).fetch(api_key())
    assert result.degraded is False, f"live catalog failed: {result.error}"

    chat = filter_models(result.models, Capability.CHAT)
    assert chat, "live catalog produced no chat-eligible models"

    for model in chat:
        # Every entry advertises at least one endpoint type this client speaks,
        # and none is a non-text-only endpoint type.
        assert model.endpoint_types, model.id
        assert not (
            model.endpoint_types & {"image-generation", "openai-video", "jina-rerank"}
        )


@pytest.mark.asyncio
async def test_live_inference_through_the_orcarouter_provider():
    """A real request through the provider this integration registers.

    The model is discovered from the live catalog rather than hardcoded, because
    which models a key may call is a property of that key's workspace — an
    ``model_access_denied`` response is a grant problem, not an integration bug,
    so the check moves on rather than reporting a false failure.
    """
    catalog = await CatalogClient(resolve_endpoints()).fetch(api_key())
    assert catalog.degraded is False, f"live catalog failed: {catalog.error}"

    candidates = [m.id for m in filter_models(catalog.models, Capability.CHAT)]
    assert candidates, "no chat-eligible model to test against"

    messages = [
        ChatMessage(
            role=MessageRole.USER,
            content="Reply with exactly one word: pong",
        )
    ]

    last_error: Exception | None = None
    for model_id in candidates:
        provider = create_llm_provider(
            provider="orcarouter", api_key=api_key(), model=model_id
        )
        # The provider must be pointed at the inference origin, not the auth one.
        assert provider.base_url == "https://api.orcarouter.ai/v1"

        try:
            reply = await provider.complete(messages)
        except OrcaRouterReauthRequired:
            raise
        except OrcaRouterAuthError as exc:
            last_error = exc
            continue

        assert isinstance(reply, str) and reply.strip(), f"{model_id} returned nothing"
        return

    pytest.fail(
        "no model in the live catalog accepted a completion request. "
        f"Last error: {last_error}"
    )


@pytest.mark.asyncio
async def test_live_streaming_through_the_orcarouter_provider():
    """The chat entry point streams; exercise that path too, not just complete()."""
    catalog = await CatalogClient(resolve_endpoints()).fetch(api_key())
    assert catalog.degraded is False, f"live catalog failed: {catalog.error}"

    candidates = [m.id for m in filter_models(catalog.models, Capability.CHAT)]
    assert candidates, "no chat-eligible model to test against"

    messages = [ChatMessage(role=MessageRole.USER, content="Count: one two three")]

    last_error: Exception | None = None
    for model_id in candidates:
        provider = create_llm_provider(
            provider="orcarouter", api_key=api_key(), model=model_id
        )
        chunks: list[str] = []
        try:
            async for token in provider.stream(messages):
                chunks.append(token)
        except OrcaRouterReauthRequired:
            raise
        except OrcaRouterAuthError as exc:
            last_error = exc
            continue

        assert chunks, f"{model_id} streamed no content"
        assert "".join(chunks).strip(), f"{model_id} streamed only whitespace"
        return

    pytest.fail(f"no model streamed successfully. Last error: {last_error}")
