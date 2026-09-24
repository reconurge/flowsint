"""OrcaRouter model catalog: live discovery, capability filtering, verified seed.

The single source of truth for the model list is ``GET /v1/models`` on the
**configured API origin** (``https://api.orcarouter.ai/v1/models`` by default).

Live discovery is authoritative when it succeeds. When it fails, a small
verified seed keeps a fresh installation usable — removing the static seed the
moment discovery is added is a classic regression: a brief catalog outage then
makes the product look like it supports no models at all.

Capabilities are never inferred from a model's name. A model appears in a
capability's dropdown only when the catalog metadata proves it belongs there;
anything undeclared **fails closed**.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Mapping, Optional, Sequence

from .config import OrcaRouterEndpoints, current_endpoints
from .errors import OrcaRouterCatalogError

#: Bound the response so a hostile or broken catalog cannot exhaust memory.
MAX_RESPONSE_BYTES = 512 * 1024
MAX_MODELS = 2000
CATALOG_TIMEOUT_SECONDS = 10.0

#: Endpoint types the OpenAI-compatible chat adapter can actually speak. A model
#: that advertises only, say, ``jina-rerank`` must not appear in a chat dropdown
#: even though it is in the catalog.
CHAT_ENDPOINT_TYPES = frozenset({"openai", "anthropic", "gemini", "openai-response"})

#: Endpoint types that are definitionally *not* text chat, and are excluded from
#: the chat dropdown even if they also advertise a chat-ish endpoint type.
NON_CHAT_ENDPOINT_TYPES = frozenset(
    {"image-generation", "openai-video", "jina-rerank", "embeddings"}
)


class Capability:
    """Capabilities an AI entry point can require of a model."""

    CHAT = "chat"
    MULTIMODAL = "multimodal"
    EMBEDDING = "embedding"
    IMAGE = "image"
    VIDEO = "video"
    RERANK = "rerank"


#: The catalog capability query parameter, when the endpoint supports one.
CAPABILITY_QUERY = {
    Capability.CHAT: "chat",
    Capability.EMBEDDING: "embedding",
    Capability.IMAGE: "image",
}

#: Strict endpoint-type match for capabilities that have no query parameter.
CAPABILITY_ENDPOINT_TYPES = {
    Capability.EMBEDDING: frozenset({"embeddings"}),
    Capability.IMAGE: frozenset({"image-generation"}),
    Capability.VIDEO: frozenset({"openai-video"}),
    Capability.RERANK: frozenset({"jina-rerank"}),
}

#: Non-text modalities a request may actually upload.
INPUT_MODALITIES = frozenset({"image", "audio", "video"})


@dataclass(frozen=True)
class CatalogModel:
    """One model, normalized to the fields the UI and the filters need."""

    id: str
    name: str = ""
    context_length: Optional[int] = None
    input_modalities: frozenset = frozenset()
    output_modalities: frozenset = frozenset()
    endpoint_types: frozenset = frozenset()
    reasoning_efforts: Sequence[str] = ()
    supported_parameters: Sequence[str] = ()

    @property
    def supports_reasoning(self) -> bool:
        return bool(self.reasoning_efforts)

    def to_public_dict(self) -> Dict[str, Any]:
        """Minimal metadata safe to send to a browser.

        Deliberately excludes anything upstream sent that we did not ask for:
        pricing internals, provider routing hints, and any field we have not
        explicitly normalized. The API key itself never travels this path — the
        catalog request is made server-side.
        """
        payload: Dict[str, Any] = {"id": self.id}
        if self.name and self.name != self.id:
            payload["name"] = self.name
        if self.context_length:
            payload["contextLength"] = self.context_length
        if self.input_modalities:
            payload["inputModalities"] = sorted(self.input_modalities)
        if self.reasoning_efforts:
            payload["reasoningEfforts"] = list(self.reasoning_efforts)
        return payload


def _as_str_set(value: Any) -> frozenset:
    if isinstance(value, str):
        return frozenset({value})
    if isinstance(value, (list, tuple, set)):
        return frozenset(str(v) for v in value if isinstance(v, (str, int, float)))
    return frozenset()


def _extract_reasoning_efforts(entry: Mapping[str, Any]) -> Sequence[str]:
    """Read a reasoning-effort ladder without inventing one.

    Vendors spell this differently, so check the shapes seen in the wild and
    return nothing when the catalog does not actually declare a ladder — a
    guessed ladder is worse than none.
    """
    for key in ("reasoning_efforts", "reasoningEfforts"):
        value = entry.get(key)
        if isinstance(value, (list, tuple)):
            efforts = [str(v) for v in value if isinstance(v, str)]
            if efforts:
                return tuple(efforts)

    reasoning = entry.get("reasoning")
    if isinstance(reasoning, Mapping):
        supported = reasoning.get("supported_efforts") or reasoning.get("efforts")
        if isinstance(supported, (list, tuple)):
            efforts = [str(v) for v in supported if isinstance(v, str)]
            if efforts:
                return tuple(efforts)
    return ()


def parse_model(entry: Mapping[str, Any]) -> Optional[CatalogModel]:
    """Normalize one catalog record, or reject it.

    Only records with a usable ``id`` survive; anything else is skipped rather
    than raising, so one malformed record cannot take down the whole catalog.
    """
    if not isinstance(entry, Mapping):
        return None
    model_id = entry.get("id")
    if not isinstance(model_id, str) or not model_id.strip():
        return None
    model_id = model_id.strip()

    architecture = entry.get("architecture")
    architecture = architecture if isinstance(architecture, Mapping) else {}

    input_modalities = _as_str_set(
        architecture.get("input_modalities")
        or architecture.get("inputModalities")
        or entry.get("input_modalities")
    )
    output_modalities = _as_str_set(
        architecture.get("output_modalities") or architecture.get("outputModalities")
    )

    endpoint_types = _as_str_set(
        entry.get("supported_endpoint_types") or entry.get("supportedEndpointTypes")
    )

    context_length = entry.get("context_length") or entry.get("contextLength")
    if not isinstance(context_length, int) or context_length <= 0:
        context_length = None

    name = entry.get("name")
    name = name.strip() if isinstance(name, str) else ""

    return CatalogModel(
        id=model_id,
        name=name,
        context_length=context_length,
        input_modalities=input_modalities,
        output_modalities=output_modalities,
        endpoint_types=endpoint_types,
        reasoning_efforts=_extract_reasoning_efforts(entry),
        supported_parameters=tuple(
            str(p)
            for p in (entry.get("supported_parameters") or [])
            if isinstance(p, str)
        ),
    )


def is_chat_model(model: CatalogModel) -> bool:
    """Text chat/agent eligibility.

    Requires at least one speakable endpoint type, and rejects the endpoint types
    that exist only for a non-text capability even when a chat-ish type is also
    advertised.
    """
    if model.endpoint_types & NON_CHAT_ENDPOINT_TYPES:
        return False
    return bool(model.endpoint_types & CHAT_ENDPOINT_TYPES)


def supports_modalities(model: CatalogModel, required: Sequence[str]) -> bool:
    """Whether the model *declares* every modality the entry point will upload.

    Fail closed: a model that does not declare the modality is excluded rather
    than assumed capable.
    """
    needed = {m for m in required if m in INPUT_MODALITIES}
    if not needed:
        return True
    return needed.issubset(model.input_modalities)


def filter_models(
    models: Sequence[CatalogModel],
    capability: str,
    *,
    required_modalities: Sequence[str] = (),
) -> List[CatalogModel]:
    """Models eligible for one entry point, in catalog order.

    This is the function every model dropdown is built from. A guard that blocks
    an incompatible attachment at send time is a second line of defence, not a
    substitute for filtering the options the selector is actually given.
    """
    if capability == Capability.CHAT:
        return [m for m in models if is_chat_model(m)]

    if capability == Capability.MULTIMODAL:
        # Chat first, then the declared non-text modality.
        return [
            m
            for m in models
            if is_chat_model(m) and supports_modalities(m, required_modalities)
        ]

    if capability == Capability.EMBEDDING:
        if required_modalities:
            return []
        return [
            m
            for m in models
            if m.endpoint_types & CAPABILITY_ENDPOINT_TYPES[Capability.EMBEDDING]
        ]

    endpoint_types = CAPABILITY_ENDPOINT_TYPES.get(capability)
    if endpoint_types is None:
        return []
    return [m for m in models if m.endpoint_types & endpoint_types]


def capability_of(model: CatalogModel) -> Optional[str]:
    """The single capability a model most directly serves, for grouping in the UI."""
    for capability, endpoint_types in CAPABILITY_ENDPOINT_TYPES.items():
        if model.endpoint_types & endpoint_types:
            return capability
    if is_chat_model(model):
        return Capability.CHAT
    return None


def select_default_model(
    models: Sequence[CatalogModel], capability: str = Capability.CHAT
) -> Optional[str]:
    """The first eligible model, in catalog order.

    Catalog order is the provider's own preference, so this needs no hardcoded
    favourite. An ``auto`` route is preferred when one exists, since routing is
    the point of a gateway.
    """
    eligible = filter_models(models, capability)
    for model in eligible:
        if model.id.endswith("/auto") or model.id == "auto":
            return model.id
    return eligible[0].id if eligible else None


# --------------------------------------------------------------------- seed

#: Verified cold-start / outage fallback. Small, and only reachable when live
#: discovery fails. Reasoning ladders here are verified metadata — a fallback
#: that restores a model id while dropping its capabilities is a silent
#: regression, so they travel with the entry.
VERIFIED_SEED: List[CatalogModel] = [
    CatalogModel(
        id="openai/gpt-5.5",
        name="GPT-5.5",
        context_length=400000,
        input_modalities=frozenset({"text", "image"}),
        output_modalities=frozenset({"text"}),
        endpoint_types=frozenset({"openai", "openai-response"}),
        reasoning_efforts=("low", "medium", "high", "xhigh"),
    ),
    CatalogModel(
        id="anthropic/claude-opus-4.8",
        name="Claude Opus 4.8",
        context_length=200000,
        input_modalities=frozenset({"text", "image"}),
        output_modalities=frozenset({"text"}),
        endpoint_types=frozenset({"anthropic", "openai"}),
        reasoning_efforts=("low", "medium", "high"),
    ),
    CatalogModel(
        id="google/gemini-3.5-flash",
        name="Gemini 3.5 Flash",
        context_length=1000000,
        input_modalities=frozenset({"text", "image", "audio", "video"}),
        output_modalities=frozenset({"text"}),
        endpoint_types=frozenset({"gemini", "openai"}),
    ),
    CatalogModel(
        id="deepseek/deepseek-v4-pro",
        name="DeepSeek V4 Pro",
        context_length=128000,
        input_modalities=frozenset({"text"}),
        output_modalities=frozenset({"text"}),
        endpoint_types=frozenset({"openai", "anthropic"}),
    ),
    CatalogModel(
        id="orcarouter/auto",
        name="OrcaRouter Auto",
        context_length=200000,
        input_modalities=frozenset({"text", "image"}),
        output_modalities=frozenset({"text"}),
        endpoint_types=frozenset({"openai", "anthropic", "gemini"}),
        reasoning_efforts=("low", "medium", "high"),
    ),
]

#: Where the seed came from, for the PR and for the degraded-state label.
SEED_SOURCE = "verified-seed"


@dataclass
class CatalogResult:
    """A catalog plus how it was obtained.

    ``degraded`` is what the UI shows when live discovery failed and the
    verified seed (or a last-known-good catalog) is standing in.
    """

    models: List[CatalogModel] = field(default_factory=list)
    source: str = SEED_SOURCE
    degraded: bool = False
    error: Optional[str] = None

    @property
    def count(self) -> int:
        return len(self.models)


def parse_catalog(payload: Any) -> List[CatalogModel]:
    """Parse a ``/v1/models`` response.

    Accepts the OpenAI ``{"data": [...]}`` envelope and a bare list.
    """
    if isinstance(payload, Mapping):
        raw = payload.get("data")
    else:
        raw = payload
    if not isinstance(raw, list):
        raise OrcaRouterCatalogError("Catalog response is not a model list")

    models: List[CatalogModel] = []
    for entry in raw[:MAX_MODELS]:
        parsed = parse_model(entry)
        if parsed is not None:
            models.append(parsed)
    return models


class CatalogClient:
    """Fetches the model catalog for a configured API origin."""

    def __init__(
        self,
        endpoints: Optional[OrcaRouterEndpoints] = None,
        *,
        http_client: Any = None,
        timeout: float = CATALOG_TIMEOUT_SECONDS,
    ) -> None:
        self._endpoints = endpoints
        self._http_client = http_client
        self._timeout = timeout

    @property
    def endpoints(self) -> OrcaRouterEndpoints:
        return self._endpoints or current_endpoints()

    async def fetch(
        self,
        api_key: Optional[str] = None,
        *,
        capability: Optional[str] = None,
    ) -> CatalogResult:
        """Fetch and normalize the catalog.

        Sends the user's own bearer token when one is available so the response
        reflects what *their* workspace can actually call. On failure returns the
        verified seed marked ``degraded`` instead of raising — a catalog outage
        must not make the provider unusable.
        """
        url = self.endpoints.models_url
        params = {}
        if capability in CAPABILITY_QUERY:
            params["capability"] = CAPABILITY_QUERY[capability]

        headers = {"Accept": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        owns_client = False
        client = self._http_client
        try:
            if client is None:
                import httpx

                client = httpx.AsyncClient(timeout=self._timeout)
                owns_client = True

            response = await client.get(url, headers=headers, params=params)
        except Exception as exc:
            # Covers a failed client construction as well as a failed request:
            # httpx builds its proxy transports eagerly, so an unusable ambient
            # proxy configuration raises here. Either way a catalog outage must
            # degrade to the verified seed rather than break the provider.
            return CatalogResult(
                models=list(VERIFIED_SEED),
                source=SEED_SOURCE,
                degraded=True,
                error=f"{type(exc).__name__}: could not reach {url}",
            )
        finally:
            if owns_client and client is not None:
                await client.aclose()

        if getattr(response, "status_code", 0) != 200:
            return CatalogResult(
                models=list(VERIFIED_SEED),
                source=SEED_SOURCE,
                degraded=True,
                error=f"HTTP {response.status_code} from {url}",
            )

        raw = getattr(response, "content", b"")
        if isinstance(raw, (bytes, bytearray)) and len(raw) > MAX_RESPONSE_BYTES:
            return CatalogResult(
                models=list(VERIFIED_SEED),
                source=SEED_SOURCE,
                degraded=True,
                error=f"Catalog response exceeded {MAX_RESPONSE_BYTES} bytes",
            )

        try:
            payload = response.json()
        except (ValueError, json.JSONDecodeError):
            return CatalogResult(
                models=list(VERIFIED_SEED),
                source=SEED_SOURCE,
                degraded=True,
                error="Catalog response was not valid JSON",
            )

        try:
            models = parse_catalog(payload)
        except OrcaRouterCatalogError as exc:
            return CatalogResult(
                models=list(VERIFIED_SEED),
                source=SEED_SOURCE,
                degraded=True,
                error=str(exc),
            )

        if not models:
            # An empty *successful* catalog is treated as an outage: falling back
            # to nothing would leave the user with no models at all.
            return CatalogResult(
                models=list(VERIFIED_SEED),
                source=SEED_SOURCE,
                degraded=True,
                error="Catalog returned no usable models",
            )

        # Live discovery succeeded: it is authoritative. The seed is deliberately
        # *not* merged in — mixing unverified entries into a verified result is
        # how a stale model id outlives its removal upstream.
        return CatalogResult(models=models, source=url, degraded=False)
