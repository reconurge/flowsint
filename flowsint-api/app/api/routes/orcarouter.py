"""API routes for OrcaRouter: two authentication entries and model discovery.

The API key never crosses back over this boundary. A key is accepted on the way
in, encrypted into the existing per-user vault, and from then on only a redacted
preview is returned. Model discovery runs server-side with the stored key, so
the browser that renders the model dropdown never holds a credential.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.orcarouter import (
    OrcaRouterApiKeyRequest,
    OrcaRouterCatalog,
    OrcaRouterConnectCompleteRequest,
    OrcaRouterConnectRequest,
    OrcaRouterConnectStart,
    OrcaRouterError,
    OrcaRouterStatus,
)
from flowsint_core.core.models import Profile
from flowsint_core.core.orcarouter import (
    CredentialSource,
    OrcaRouterAuthError,
    OrcaRouterService,
    create_orcarouter_service,
    redact,
)
from flowsint_core.core.postgre_db import get_db

router = APIRouter()


def _status(service: OrcaRouterService, current_user: Profile) -> OrcaRouterStatus:
    credential = service.credential(current_user.id)
    needs_reauth = service.needs_reauth(current_user.id)
    usable = credential is not None and not needs_reauth
    return OrcaRouterStatus(
        connected=usable,
        source=credential.source if credential else None,
        # Redacted: enough to confirm *which* key is installed, never the key.
        masked_key=redact(credential.api_key) if credential else None,
        needs_reauth=needs_reauth,
    )


@router.get("", response_model=OrcaRouterStatus)
def get_orcarouter_status(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
) -> OrcaRouterStatus:
    """Current OrcaRouter credential state for this user."""
    return _status(create_orcarouter_service(db), current_user)


@router.post("/api-key", response_model=OrcaRouterStatus)
def save_orcarouter_api_key(
    payload: OrcaRouterApiKeyRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
) -> OrcaRouterStatus:
    """Entry point 1 of 2 — store an existing ``sk-orca-…`` key.

    Independent of the PKCE flow: a user who already has a key, or who is
    running headless, never has to touch the browser login.
    """
    service = create_orcarouter_service(db)
    try:
        service.save_api_key(current_user.id, payload.api_key)
    except ValueError as exc:
        # A shape error. The message never contains the key.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from None
    return _status(service, current_user)


@router.delete("", response_model=OrcaRouterStatus)
def disconnect_orcarouter(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
) -> OrcaRouterStatus:
    """Remove the stored credential and release any in-flight login."""
    service = create_orcarouter_service(db)
    service.disconnect(current_user.id)
    return _status(service, current_user)


@router.post("/connect", response_model=OrcaRouterConnectStart)
def start_orcarouter_connect(
    payload: Optional[OrcaRouterConnectRequest] = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
) -> OrcaRouterConnectStart:
    """Entry point 2 of 2 — begin OAuth 2.0 + PKCE.

    Returns the consent URL for the user to open. The verifier stays on the
    server; only its SHA-256 challenge travels on the URL.
    """
    service = create_orcarouter_service(db)
    request = payload or OrcaRouterConnectRequest()
    try:
        attempt_id, authorize_url = service.connect_manager.start(
            current_user.id,
            scope=request.scope,
            login_hint=request.login_hint,
            workspace_hint=request.workspace_hint,
        )
    except OrcaRouterAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(exc), "terminal": exc.terminal},
        ) from None

    from flowsint_core.core.orcarouter.pkce_flow import DEFAULT_TIMEOUT_SECONDS

    return OrcaRouterConnectStart(
        attempt_id=attempt_id,
        authorize_url=authorize_url,
        expires_in=int(DEFAULT_TIMEOUT_SECONDS),
    )


@router.post("/connect/complete", response_model=OrcaRouterStatus)
async def complete_orcarouter_connect(
    payload: OrcaRouterConnectCompleteRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
) -> OrcaRouterStatus:
    """Exchange the displayed code for a key and persist it.

    Failure here releases the login lock so the user can retry; a partial or
    abandoned attempt never leaves the UI stuck.
    """
    service = create_orcarouter_service(db)
    try:
        await service.connect_manager.complete(payload.attempt_id, payload.code)
    except OrcaRouterAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(exc), "terminal": exc.terminal},
        ) from None
    return _status(service, current_user)


@router.post("/connect/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_orcarouter_connect(
    attempt_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
) -> None:
    """Release the OAuth login lock.

    Called on every terminal path the browser can observe: an explicit Cancel
    button, denial, switching provider or authentication method, closing the
    modal, unmount, and ``pagehide`` (with ``keepalive``). Without this the
    server keeps the "login in progress" lock and the next attempt is refused.
    """
    service = create_orcarouter_service(db)
    if attempt_id:
        service.connect_manager.cancel(attempt_id)
    else:
        service.connect_manager.cancel_owner(current_user.id)
    return None


@router.get("/models", response_model=OrcaRouterCatalog)
async def get_orcarouter_models(
    entry_point: str = Query(
        default="chat",
        description="Which AI entry point is asking; selects the capability filter.",
    ),
    modalities: Optional[str] = Query(
        default=None,
        description="Comma-separated non-text modalities this entry point uploads.",
    ),
    refresh: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
) -> OrcaRouterCatalog:
    """The model catalog, filtered for one entry point.

    Fetched server-side with the user's own key so the list reflects what their
    workspace can actually call, and so the key never reaches the browser.
    """
    service = create_orcarouter_service(db)
    required = [m.strip() for m in (modalities or "").split(",") if m.strip()]

    result = await service.models_for_entry_point(
        entry_point, current_user.id, required_modalities=required, refresh=refresh
    )
    payload = service.public_catalog(result)
    return OrcaRouterCatalog(**payload)


__all__ = ["router", "OrcaRouterError", "CredentialSource"]
