"""OrcaRouter provider integration.

Two authentication choices, one credential, one inference path:

* ``orcarouter`` — "OrcaRouter - API": the user pastes an existing ``sk-orca-…``.
* ``orcarouter-oauth`` — "OrcaRouter - Auth": OAuth 2.0 + PKCE (out-of-band
  code) issues the same kind of key from the user's own account.

Both go through :class:`~.credentials.CredentialProvider` and yield the same
:class:`~.credentials.CredentialResult`; nothing downstream knows which ran.
"""

from .api_key_provider import ApiKeyCredentialProvider
from .catalog import (
    SEED_SOURCE,
    VERIFIED_SEED,
    Capability,
    CatalogClient,
    CatalogModel,
    CatalogResult,
    filter_models,
    parse_catalog,
    parse_model,
    select_default_model,
)
from .config import (
    DEFAULT_API_BASE,
    DEFAULT_AUTH_BASE,
    OrcaRouterEndpoints,
    current_endpoints,
    resolve_endpoints,
)
from .credentials import (
    API_KEY_ENV_VAR,
    API_KEY_PREFIX,
    PROVIDER_ID_API_KEY,
    PROVIDER_ID_OAUTH,
    PROVIDER_LABEL_API_KEY,
    PROVIDER_LABEL_OAUTH,
    VAULT_KEY_NAME,
    CredentialProvider,
    CredentialResult,
    CredentialSource,
    redact,
    validate_api_key_shape,
)
from .errors import (
    OrcaRouterAuthError,
    OrcaRouterCatalogError,
    OrcaRouterConfigError,
    OrcaRouterError,
    OrcaRouterReauthRequired,
)
from .pkce import (
    CODE_CHALLENGE_METHOD,
    code_challenge,
    generate_state,
    generate_verifier,
    state_matches,
)
from .pkce_flow import ConnectAttempt, PkceConnectManager
from .provider import OrcaRouterProvider
from .store import CredentialStore


def __getattr__(name: str) -> object:
    """Resolve the service layer lazily.

    ``orcarouter.service`` imports ``services.base``, which pulls in the whole
    service package — and that package imports back into this one. Deferring the
    two service symbols to attribute access breaks the cycle without forcing
    every caller that only needs, say, the PKCE helpers to import the service
    layer.
    """
    if name in (
        "OrcaRouterService",
        "create_orcarouter_service",
        "resolve_provider_api_key",
    ):
        from . import service as _service

        return getattr(_service, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "API_KEY_ENV_VAR",
    "API_KEY_PREFIX",
    "ApiKeyCredentialProvider",
    "CODE_CHALLENGE_METHOD",
    "CatalogClient",
    "CatalogModel",
    "CatalogResult",
    "ConnectAttempt",
    "Capability",
    "CredentialProvider",
    "CredentialResult",
    "CredentialSource",
    "CredentialStore",
    "DEFAULT_API_BASE",
    "DEFAULT_AUTH_BASE",
    "OrcaRouterAuthError",
    "OrcaRouterCatalogError",
    "OrcaRouterConfigError",
    "OrcaRouterEndpoints",
    "OrcaRouterError",
    "OrcaRouterProvider",
    "OrcaRouterReauthRequired",
    "PROVIDER_ID_API_KEY",
    "PROVIDER_ID_OAUTH",
    "PROVIDER_LABEL_API_KEY",
    "PROVIDER_LABEL_OAUTH",
    "PkceConnectManager",
    "SEED_SOURCE",
    "VAULT_KEY_NAME",
    "VERIFIED_SEED",
    "code_challenge",
    "current_endpoints",
    "filter_models",
    "generate_state",
    "generate_verifier",
    "parse_catalog",
    "parse_model",
    "redact",
    "resolve_endpoints",
    "select_default_model",
    "state_matches",
    "validate_api_key_shape",
]
