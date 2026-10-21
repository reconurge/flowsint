"""OrcaRouter service: one place that answers "how do I talk to OrcaRouter?".

Both authentication adapters, both AI entry points, and the model catalog meet
here. The entry points (chat, enricher template generation) call this and never
touch a vault, a PKCE verifier, or an HTTP client directly.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

from .api_key_provider import ApiKeyCredentialProvider
from .catalog import (
    SEED_SOURCE,
    Capability,
    CatalogClient,
    CatalogModel,
    CatalogResult,
    filter_models,
)
from .config import OrcaRouterEndpoints, current_endpoints
from .credentials import (
    VAULT_KEY_NAME,
    CredentialResult,
    CredentialSource,
)
from .errors import OrcaRouterAuthError
from .pkce_flow import PkceConnectManager
from .store import CredentialStore

#: Capability each AI entry point in this repository needs.
#: Both are text chat — neither uploads an attachment, so both filter on
#: :data:`Capability.CHAT` and neither may offer an image-generation, video, or
#: rerank model.
ENTRY_POINT_CAPABILITIES: Dict[str, str] = {
    "chat": Capability.CHAT,
    "template_generator": Capability.CHAT,
}


class OrcaRouterService:
    """Credential lifecycle plus model discovery for OrcaRouter."""

    def __init__(
        self,
        db: Any,
        *,
        endpoints: Optional[OrcaRouterEndpoints] = None,
        catalog_client: Optional[CatalogClient] = None,
        store: Optional[CredentialStore] = None,
        vault_service: Any = None,
        connect_manager: Optional[PkceConnectManager] = None,
    ) -> None:
        self._db = db
        self._endpoints = endpoints
        self._store = store or CredentialStore(db, vault_service=vault_service)
        self._catalog_client = catalog_client or CatalogClient(endpoints=self.endpoints)
        self._api_key = ApiKeyCredentialProvider(self._store)
        self._connect = connect_manager or PkceConnectManager(
            self._store, endpoints=endpoints
        )
        self._catalog_cache: Optional[CatalogResult] = None

    @property
    def endpoints(self) -> OrcaRouterEndpoints:
        return self._endpoints or current_endpoints()

    # ------------------------------------------------------------ credentials

    @property
    def api_key_provider(self) -> ApiKeyCredentialProvider:
        """The "OrcaRouter - API" entry: paste an existing key."""
        return self._api_key

    @property
    def connect_manager(self) -> PkceConnectManager:
        """The "OrcaRouter - Auth" entry: OAuth 2.0 + PKCE."""
        return self._connect

    def credential(self, owner_id: UUID) -> Optional[CredentialResult]:
        """The stored credential, from whichever adapter produced it.

        This is the single read used by inference and discovery. It does not
        branch on the credential's source — that is what makes the two entry
        points genuinely interchangeable rather than two parallel stacks.
        """
        return self._store.load(owner_id)

    def api_key(self, owner_id: UUID) -> Optional[str]:
        return self._store.current_api_key(owner_id)

    def is_connected(self, owner_id: UUID) -> bool:
        return self.api_key(owner_id) is not None

    def needs_reauth(self, owner_id: UUID) -> bool:
        """Whether the stored credential was rejected upstream.

        OrcaRouter keys are durable and unrefreshable, so this is terminal until
        a new login or a new pasted key succeeds.
        """
        return self._store.needs_reauth(owner_id)

    def credential_generation(self, owner_id: UUID) -> int:
        return self._store.credential_generation(owner_id)

    def disconnect(self, owner_id: UUID) -> None:
        """Remove the stored credential and release any in-flight login."""
        self._connect.cancel_owner(owner_id)
        self._store.clear(owner_id)
        self._catalog_cache = None

    def save_api_key(self, owner_id: UUID, raw_key: str) -> CredentialResult:
        self._catalog_cache = None
        return self._api_key.save(owner_id, raw_key)

    def handle_upstream_unauthorized(
        self, owner_id: UUID, generation: Optional[int] = None
    ) -> bool:
        """Record an upstream ``401`` against the exact rejected credential.

        There is no refresh grant to run, so this marks the credential
        ``needs_reauth`` rather than retrying. If a newer credential has since
        been stored, the call is a no-op — a late failure from an old request
        never marks a freshly reauthorized credential as broken.
        """
        return self._store.mark_rejected(owner_id, generation)

    # --------------------------------------------------------------- catalog

    async def catalog(
        self, owner_id: Optional[UUID] = None, *, refresh: bool = False
    ) -> CatalogResult:
        """The model catalog for this deployment.

        Uses the user's own key when one is stored, so the list reflects what
        their workspace can actually call. Cached in-process between calls; the
        key is never sent to the browser, only the normalized metadata is.
        """
        if self._catalog_cache is not None and not refresh:
            return self._catalog_cache

        api_key = self.api_key(owner_id) if owner_id else None
        result = await self._catalog_client.fetch(api_key)
        self._catalog_cache = result
        return result

    async def models_for_entry_point(
        self,
        entry_point: str,
        owner_id: Optional[UUID] = None,
        *,
        required_modalities: Optional[List[str]] = None,
        refresh: bool = False,
    ) -> CatalogResult:
        """A catalog already filtered for one AI entry point.

        Filtering happens here, centrally, so a new entry point cannot forget it
        and a new capability cannot be added in five places.
        """
        catalog = await self.catalog(owner_id, refresh=refresh)
        capability = ENTRY_POINT_CAPABILITIES.get(entry_point, Capability.CHAT)
        models = filter_models(
            catalog.models,
            capability,
            required_modalities=required_modalities or (),
        )
        return CatalogResult(
            models=models,
            source=catalog.source,
            degraded=catalog.degraded,
            error=catalog.error,
        )

    def public_catalog(self, result: CatalogResult) -> Dict[str, object]:
        """Serialize a catalog for the browser.

        Only normalized, non-secret metadata crosses this boundary. The API key
        stays on the server — the browser that renders the dropdown never holds
        a credential it could exfiltrate.
        """
        return {
            "models": [m.to_public_dict() for m in result.models],
            "source": result.source,
            "degraded": result.degraded,
            "error": result.error,
            "count": result.count,
            "isSeed": result.source == SEED_SOURCE,
        }


def create_orcarouter_service(db: Any) -> OrcaRouterService:
    from ..services.vault_service import VaultService

    return OrcaRouterService(db=db, vault_service=VaultService(db=db))


def resolve_provider_api_key(
    db: Any, vault_service: Any, owner_id: UUID, provider_name: str
) -> Optional[str]:
    """The API key an AI entry point should use for ``provider_name``.

    Every entry point resolves credentials through here rather than each
    re-implementing the lookup. For OrcaRouter specifically the value comes from
    the credential seam, so a pasted key and an account login are
    indistinguishable to the caller — and a credential already known to be
    revoked is never handed to an SDK client.
    """
    vault_ref = f"{provider_name.upper()}_API_KEY"

    if provider_name != "orcarouter":
        value = vault_service.get_secret(owner_id, vault_ref)
        return str(value) if value is not None else None

    store = CredentialStore(db, vault_service=vault_service)
    key = store.current_api_key(owner_id)
    return str(key) if key is not None else None


__all__ = [
    "ENTRY_POINT_CAPABILITIES",
    "OrcaRouterService",
    "create_orcarouter_service",
    "resolve_provider_api_key",
    "CredentialSource",
    "OrcaRouterAuthError",
    "VAULT_KEY_NAME",
    "CatalogModel",
]
