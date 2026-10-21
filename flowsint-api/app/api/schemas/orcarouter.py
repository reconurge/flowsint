"""Pydantic schemas for the OrcaRouter provider integration.

Nothing here carries a credential. The API key is write-only on the way in and
is never serialized back out; the browser only ever receives redacted hints
(:class:`OrcaRouterStatus.masked_key`) and non-secret model metadata.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class OrcaRouterStatus(BaseModel):
    """Whether OrcaRouter is usable, and through which entry point."""

    #: A credential is stored and not known to be revoked.
    connected: bool
    #: ``api_key`` or ``oauth_pkce`` — which adapter produced the stored key.
    #: ``None`` when nothing is stored.
    source: Optional[str] = None
    #: Redacted preview (``sk-orca-••••••••mnop``). Never the key itself.
    masked_key: Optional[str] = None
    #: The stored credential was rejected upstream; a new key or login is needed.
    needs_reauth: bool = False
    #: Where to create or revoke keys, so the UI can link to it.
    dashboard_url: str = "https://www.orcarouter.ai/console/authorized-apps"


class OrcaRouterApiKeyRequest(BaseModel):
    """Paste an existing ``sk-orca-…`` key."""

    api_key: str = Field(min_length=1, description="An OrcaRouter API key")


class OrcaRouterConnectRequest(BaseModel):
    """Begin an OAuth 2.0 + PKCE authorization."""

    scope: str = "api"
    login_hint: Optional[str] = None
    workspace_hint: Optional[str] = None


class OrcaRouterConnectStart(BaseModel):
    """The authorize URL the user opens, plus the attempt it belongs to."""

    attempt_id: str
    authorize_url: str
    expires_in: int


class OrcaRouterConnectCompleteRequest(BaseModel):
    """The code displayed on the consent screen, pasted back by the user."""

    attempt_id: str
    code: str = Field(min_length=1)


class OrcaRouterError(BaseModel):
    error: str
    #: Whether retrying this attempt could ever succeed. Drives whether the UI
    #: offers a retry or asks the user to start a new authorization.
    terminal: bool = False


class OrcaRouterModel(BaseModel):
    """Normalized, non-secret model metadata for the model selector."""

    id: str
    name: Optional[str] = None
    contextLength: Optional[int] = None
    inputModalities: Optional[List[str]] = None
    reasoningEfforts: Optional[List[str]] = None


class OrcaRouterCatalog(BaseModel):
    """A model catalog, already filtered for the entry point that asked."""

    models: List[OrcaRouterModel]
    #: ``verified-seed`` when live discovery failed, otherwise the catalog URL.
    source: str
    #: True when this is the fallback rather than live data. The UI must label it.
    degraded: bool
    isSeed: bool
    count: int
    error: Optional[str] = None
