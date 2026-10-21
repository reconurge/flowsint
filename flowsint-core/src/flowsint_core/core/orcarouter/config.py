"""OrcaRouter endpoint configuration.

Authentication and inference live on **different public origins**:

* ``https://www.orcarouter.ai`` — the consent screen (``/auth``) and the code
  exchange (``/api/v1/auth/keys``);
* ``https://api.orcarouter.ai/v1`` — inference and model discovery.

Neither origin is ever derived from the other. The single most common
integration mistake is exchanging a code against ``api.orcarouter.ai/v1/auth/keys``
because the relay lives at ``/v1`` while the auth API does not: that path does
not exist on the inference origin (it redirects to the auth origin and 404s
there), so the exchange must be built from the auth base, never from the API
base.

Self-hosted deployments may run both roles on one origin, so ``ORCA_BASE_URL``
acts as a shared fallback while ``ORCA_AUTH_BASE_URL`` / ``ORCA_API_BASE_URL``
override it per role. An explicit override always wins over the shared value.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Mapping, Optional
from urllib.parse import urlsplit

from .errors import OrcaRouterConfigError

DEFAULT_AUTH_BASE = "https://www.orcarouter.ai"
DEFAULT_API_BASE = "https://api.orcarouter.ai"

#: Loopback hosts permitted to use plain HTTP (local development only).
_LOOPBACK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1", "[::1]"})

AUTHORIZE_PATH = "/auth"
EXCHANGE_PATH = "/api/v1/auth/keys"
DEVICE_CODE_PATH = "/api/v1/auth/device/code"
DEVICE_TOKEN_PATH = "/api/v1/auth/device/token"

__all__ = [
    "AUTHORIZE_PATH",
    "DEFAULT_API_BASE",
    "DEFAULT_AUTH_BASE",
    "EXCHANGE_PATH",
    "OrcaRouterConfigError",
    "OrcaRouterEndpoints",
    "current_endpoints",
    "resolve_endpoints",
]


def _normalize_origin(raw: str, *, role: str) -> str:
    """Validate and normalize an origin, returning it without a trailing slash.

    Remote origins must be HTTPS. Plain HTTP is permitted only for loopback so a
    developer can point the flow at a local stub; anything else is rejected
    rather than silently sending credentials in the clear.
    """
    value = (raw or "").strip()
    if not value:
        raise OrcaRouterConfigError(f"{role} base URL is empty")

    parts = urlsplit(value)
    if not parts.scheme or not parts.netloc:
        raise OrcaRouterConfigError(
            f"{role} base URL must be an absolute URL, got {value!r}"
        )

    scheme = parts.scheme.lower()
    host = (parts.hostname or "").lower()

    if scheme not in ("http", "https"):
        raise OrcaRouterConfigError(
            f"{role} base URL must use http or https, got {scheme!r}"
        )
    if scheme == "http" and host not in _LOOPBACK_HOSTS:
        raise OrcaRouterConfigError(
            f"{role} base URL must use HTTPS for non-loopback hosts, got {value!r}. "
            "Plain HTTP is only allowed for localhost/127.0.0.1/[::1]."
        )

    origin = f"{scheme}://{parts.netloc}"
    path = parts.path.rstrip("/")
    if path:
        origin += path
    return origin


@dataclass(frozen=True)
class OrcaRouterEndpoints:
    """Resolved OrcaRouter origins for one deployment."""

    auth_base: str
    api_base: str

    @property
    def authorize_url(self) -> str:
        """Consent screen. Opened in a browser; it is not an API."""
        return f"{self.auth_base}{AUTHORIZE_PATH}"

    @property
    def exchange_url(self) -> str:
        """Code-for-key exchange. Always on the **auth** origin."""
        return f"{self.auth_base}{EXCHANGE_PATH}"

    @property
    def device_code_url(self) -> str:
        return f"{self.auth_base}{DEVICE_CODE_PATH}"

    @property
    def device_token_url(self) -> str:
        return f"{self.auth_base}{DEVICE_TOKEN_PATH}"

    @property
    def inference_base(self) -> str:
        """OpenAI-compatible inference root, e.g. ``https://api.orcarouter.ai/v1``."""
        return f"{self.api_base}/v1"

    @property
    def models_url(self) -> str:
        """Authoritative model catalog for the configured API origin."""
        return f"{self.inference_base}/models"


def _strip_inference_suffix(origin: str) -> str:
    """Tolerate an operator who pasted the inference root into the API override.

    ``ORCA_API_BASE_URL=https://api.orcarouter.ai/v1`` is a natural mistake and
    it is unambiguous, so accept it instead of producing ``/v1/v1/models``.
    """
    return origin[: -len("/v1")] if origin.endswith("/v1") else origin


def resolve_endpoints(
    env: Optional[Mapping[str, str]] = None,
) -> OrcaRouterEndpoints:
    """Resolve endpoints from the environment.

    Precedence, highest first: explicit ``ORCA_AUTH_BASE_URL`` /
    ``ORCA_API_BASE_URL``, then the shared ``ORCA_BASE_URL``, then the public
    defaults.
    """
    source: Mapping[str, str] = os.environ if env is None else env
    shared = (source.get("ORCA_BASE_URL") or "").strip() or None

    auth_raw = (source.get("ORCA_AUTH_BASE_URL") or "").strip() or shared
    api_raw = (source.get("ORCA_API_BASE_URL") or "").strip() or shared

    auth_base = _normalize_origin(auth_raw or DEFAULT_AUTH_BASE, role="OrcaRouter auth")
    api_base = _normalize_origin(api_raw or DEFAULT_API_BASE, role="OrcaRouter API")

    return OrcaRouterEndpoints(
        auth_base=auth_base,
        api_base=_strip_inference_suffix(api_base),
    )


def current_endpoints() -> OrcaRouterEndpoints:
    """Endpoints for the running process."""
    return resolve_endpoints()
