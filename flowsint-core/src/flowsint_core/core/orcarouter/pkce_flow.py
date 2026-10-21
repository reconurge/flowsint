"""OAuth 2.0 + PKCE connect flow for the "OrcaRouter - Auth" entry point.

**Flow B — out-of-band code.** flowsint is self-hosted software: the compose
files deploy it on a LAN box, a NAS, or any host, and the browser looking at the
dashboard is frequently not the machine running the API process. A loopback
listener (Flow A) assumes those are the same host and that a port published from
inside a container is reachable from the browser, neither of which holds here.
Flow B has no address to predict and no callback to register, which is precisely
why it exists. Flow C (device grant) is a possible follow-up; PKCE carries the
requirement.

**S256 always.** Even under Flow A a user may choose "show me a code" on the
consent screen, and there is no authorize parameter that prevents it. A code
that reaches human hands must be redeemable only by the process holding the
verifier, so ``plain`` is never sent.

**The returned key is durable, not refreshable.** OrcaRouter hands back a normal
API key. There is no refresh grant and no refresh endpoint, so nothing here
schedules a refresh; the key is reused until it is revoked, and a ``401`` means
re-authenticate.
"""

from __future__ import annotations

import asyncio
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode
from uuid import UUID, uuid4

from .config import OrcaRouterEndpoints, current_endpoints
from .credentials import (
    CredentialResult,
    CredentialSource,
)
from .errors import OrcaRouterAuthError
from .pkce import (
    CODE_CHALLENGE_METHOD,
    code_challenge,
    generate_state,
    generate_verifier,
)

#: A login that has not been completed within this window is abandoned. The
#: auth code itself lives 10 minutes server-side; this is the client's own
#: budget for the human step, and it is deliberately shorter.
DEFAULT_TIMEOUT_SECONDS = 300.0

#: The scope this client asks for. ``api`` is the inference scope; ``connector``
#: is a wider grant that most workspace roles cannot approve.
REQUESTED_SCOPE = "api"


@dataclass
class ConnectAttempt:
    """State for exactly one authorization attempt.

    The verifier lives here and nowhere else until the exchange request body is
    built. It is never logged, never put in the authorize URL (only its hash
    is), and never returned to a caller.
    """

    attempt_id: str
    owner_id: str
    verifier: str
    state: str
    authorize_url: str
    scope: str = REQUESTED_SCOPE
    created_at: float = field(default_factory=time.monotonic)
    cancelled: bool = False
    consumed: bool = False
    code: Optional[str] = None

    def is_expired(self, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> bool:
        return (time.monotonic() - self.created_at) > timeout

    def __repr__(self) -> str:  # pragma: no cover - trivial, but load-bearing
        # A traceback that formats locals must not print the verifier.
        return (
            f"ConnectAttempt(attempt_id={self.attempt_id!r}, "
            f"owner_id={self.owner_id!r}, verifier=<redacted>, "
            f"state={self.state!r}, consumed={self.consumed}, "
            f"cancelled={self.cancelled})"
        )

    __str__ = __repr__


class PkceConnectManager:
    """Server-side registry of in-flight logins.

    Holds the "login already in progress" lock, issues authorize URLs, resolves
    the code the user pastes back, and exchanges it. Every terminal path —
    success, denial, exchange error, timeout, explicit cancel, provider switch,
    modal close, unmount, and ``pagehide`` — must release the lock, otherwise
    the UI stays busy forever.
    """

    def __init__(
        self,
        store: Any,
        *,
        endpoints: Optional[OrcaRouterEndpoints] = None,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
        app_name: str = "Flowsint",
        http_client: Any = None,
    ) -> None:
        self._store = store
        self._endpoints = endpoints
        self._timeout = timeout
        self._app_name = app_name
        self._http_client = http_client

        self._lock = threading.Lock()
        self._attempts: Dict[str, ConnectAttempt] = {}
        self._active_by_owner: Dict[str, str] = {}
        self._attempt_generation: Dict[str, int] = {}

        # Monotonic generation per owner. A response that belongs to an older
        # generation must not overwrite credentials or UI state owned by a newer
        # one — a late success from attempt N cannot land after attempt N+1.
        self._generation: Dict[str, int] = {}

    @property
    def endpoints(self) -> OrcaRouterEndpoints:
        return self._endpoints or current_endpoints()

    # ------------------------------------------------------------- lifecycle

    def start(
        self,
        owner_id: UUID,
        *,
        scope: str = REQUESTED_SCOPE,
        login_hint: Optional[str] = None,
        workspace_hint: Optional[str] = None,
    ) -> Tuple[str, str]:
        """Begin an attempt and return ``(attempt_id, authorize_url)``.

        Starting a new attempt supersedes any attempt already in flight for the
        same owner: the old generation is invalidated so its response is dropped
        rather than racing the new one.
        """
        if scope not in ("api", "connector"):
            raise OrcaRouterAuthError(
                f"Unsupported scope {scope!r}; OrcaRouter accepts 'api' or 'connector'.",
                terminal=True,
            )

        owner = str(owner_id)
        with self._lock:
            self._drop_owner_attempts(owner)
            self._generation[owner] = self._generation.get(owner, 0) + 1
            generation = self._generation[owner]

            attempt = ConnectAttempt(
                attempt_id=uuid4().hex,
                owner_id=owner,
                verifier=generate_verifier(),
                state=generate_state(),
                authorize_url="",
                scope=scope,
            )
            attempt.authorize_url = self._build_authorize_url(
                attempt, login_hint=login_hint, workspace_hint=workspace_hint
            )
            self._attempts[attempt.attempt_id] = attempt
            self._active_by_owner[owner] = attempt.attempt_id
            # Generation is stamped onto the attempt so resolution can check it.
            self._attempt_generation[attempt.attempt_id] = generation
            return attempt.attempt_id, attempt.authorize_url

    def _build_authorize_url(
        self,
        attempt: ConnectAttempt,
        *,
        login_hint: Optional[str],
        workspace_hint: Optional[str],
    ) -> str:
        # Only the *challenge* travels on the URL. A challenge is useless to an
        # interceptor without the verifier, which never leaves this process.
        params = {
            "callback_url": "oob",
            "code_challenge": code_challenge(attempt.verifier),
            "code_challenge_method": CODE_CHALLENGE_METHOD,
            "state": attempt.state,
            "app_name": self._app_name,
            "scope": attempt.scope,
        }
        if login_hint:
            params["login_hint"] = login_hint
        if workspace_hint:
            params["workspace_hint"] = workspace_hint
        return f"{self.endpoints.authorize_url}?{urlencode(params)}"

    def get(self, attempt_id: str) -> Optional[ConnectAttempt]:
        return self._attempts.get(attempt_id)

    def generation_of(self, attempt_id: str) -> int:
        return self._attempt_generation.get(attempt_id, 0)

    def is_current(self, attempt_id: str) -> bool:
        """Whether this attempt still owns the owner's login slot.

        Every async response and poll iteration checks this before touching
        credentials or UI state.
        """
        attempt = self._attempts.get(attempt_id)
        if attempt is None:
            return False
        return self._active_by_owner.get(attempt.owner_id) == attempt_id

    def cancel(self, attempt_id: str) -> bool:
        """Release the login lock for this attempt.

        Safe to call for every terminal path and for paths that already
        finished; returns whether an in-flight attempt was actually cleared.
        """
        with self._lock:
            attempt = self._attempts.get(attempt_id)
            if attempt is None:
                return False
            attempt.cancelled = True
            if self._active_by_owner.get(attempt.owner_id) == attempt_id:
                self._active_by_owner.pop(attempt.owner_id, None)
            return True

    def cancel_owner(self, owner_id: UUID) -> int:
        """Release every attempt for an owner (provider switch, unmount, close)."""
        owner = str(owner_id)
        with self._lock:
            ids = [aid for aid, a in self._attempts.items() if a.owner_id == owner]
            for aid in ids:
                self._attempts[aid].cancelled = True
            self._active_by_owner.pop(owner, None)
            return len(ids)

    def active_attempt_id(self, owner_id: UUID) -> Optional[str]:
        return self._active_by_owner.get(str(owner_id))

    def _drop_owner_attempts(self, owner: str) -> None:
        for aid in [aid for aid, a in self._attempts.items() if a.owner_id == owner]:
            self._attempts[aid].cancelled = True
            self._attempts.pop(aid, None)
            self._attempt_generation.pop(aid, None)
        self._active_by_owner.pop(owner, None)

    # -------------------------------------------------------------- exchange

    async def complete(self, attempt_id: str, code: str) -> CredentialResult:
        """Exchange the pasted/returned code and persist the resulting key.

        The exchange goes to the **auth** origin (``/api/v1/auth/keys``), never
        the inference origin — ``api.orcarouter.ai/v1/auth/keys`` does not
        exist (it redirects to the auth origin and 404s there).
        """
        attempt = self._attempts.get(attempt_id)
        if attempt is None:
            raise OrcaRouterAuthError(
                "This authorization attempt is no longer active. Start a new one.",
                terminal=True,
            )

        generation = self.generation_of(attempt_id)

        if attempt.cancelled:
            raise OrcaRouterAuthError(
                "This authorization attempt was cancelled.", terminal=True
            )
        if not self.is_current(attempt_id):
            raise OrcaRouterAuthError(
                "A newer authorization attempt replaced this one.", terminal=True
            )
        if attempt.is_expired(self._timeout):
            self.cancel(attempt_id)
            raise OrcaRouterAuthError(
                "The authorization attempt timed out. Start a new one.", terminal=True
            )
        if attempt.consumed:
            # A code is single-use; retrying a consumed attempt re-sends a spent
            # code and earns a 403.
            raise OrcaRouterAuthError(
                "This authorization attempt has already been used.", terminal=True
            )

        submitted = (code or "").strip()
        if not submitted:
            raise OrcaRouterAuthError("No authorization code was provided.")

        attempt.consumed = True
        try:
            payload = await self._exchange(attempt, submitted, generation)
        except OrcaRouterAuthError:
            # Terminal upstream failure: release the lock so the user can retry
            # rather than leaving the UI stuck on a dead attempt.
            self.cancel(attempt_id)
            raise
        except Exception:
            self.cancel(attempt_id)
            raise

        # Only now store the credential. Nothing is deleted before the
        # replacement is safely persisted, so a failed exchange cannot destroy a
        # working key.
        result: CredentialResult = self._store.save(
            UUID(attempt.owner_id), payload["key"], CredentialSource.OAUTH_PKCE
        )
        self.cancel(attempt_id)
        return result

    async def _exchange(
        self, attempt: ConnectAttempt, code: str, generation: int
    ) -> Dict[str, str]:
        client = self._http_client
        owns_client = False
        if client is None:
            import httpx

            client = httpx.AsyncClient(timeout=30.0)
            owns_client = True

        try:
            response = await client.post(
                self.endpoints.exchange_url,
                json={
                    "code": code,
                    "code_verifier": attempt.verifier,
                    "code_challenge_method": CODE_CHALLENGE_METHOD,
                },
            )
        except OrcaRouterAuthError:
            raise
        except Exception as exc:
            # Network failure: report the type, never the request body.
            raise OrcaRouterAuthError(
                f"Could not reach OrcaRouter to exchange the code: {type(exc).__name__}"
            ) from None
        finally:
            if owns_client:
                await client.aclose()

        status = getattr(response, "status_code", 0)
        if status != 200:
            raise self._exchange_error(status, _safe_error_body(response))

        try:
            body = response.json()
        except Exception:
            raise OrcaRouterAuthError(
                "OrcaRouter returned a malformed exchange response.", terminal=True
            ) from None

        key = body.get("key") if isinstance(body, dict) else None
        if not key:
            raise OrcaRouterAuthError(
                "OrcaRouter returned no key for this authorization.", terminal=True
            )

        granted_scope = body.get("scope")
        if granted_scope != attempt.scope:
            # The response says what was *granted*, which can be narrower than
            # what was asked for. Accept it only if it still serves inference;
            # otherwise say so rather than assume we hold the wider grant.
            if granted_scope != REQUESTED_SCOPE:
                raise OrcaRouterAuthError(
                    f"OrcaRouter granted scope {granted_scope!r}, which does not "
                    f"permit inference. Request {REQUESTED_SCOPE!r} from an "
                    "account with access, or use an API key.",
                    terminal=True,
                )
            attempt.scope = granted_scope

        # A response arriving after a newer attempt started must not overwrite
        # the newer credential.
        if not self.is_current(attempt.attempt_id):
            raise OrcaRouterAuthError(
                "A newer authorization attempt replaced this one.", terminal=True
            )

        return {"key": key, "scope": granted_scope or REQUESTED_SCOPE}

    @staticmethod
    def _exchange_error(status: int, detail: Optional[str]) -> OrcaRouterAuthError:
        if status == 400:
            return OrcaRouterAuthError(
                "OrcaRouter rejected the challenge method. This is a client bug — "
                "please report it.",
                status=status,
                terminal=True,
            )
        if status == 403:
            return OrcaRouterAuthError(
                "This authorization code is unknown, expired, or already used. "
                "Start a new authorization.",
                status=status,
                terminal=True,
            )
        if status == 429:
            return OrcaRouterAuthError(
                "Too many authorization requests. OrcaRouter allows 10 issued keys "
                "per user per 24 hours — reuse the stored key, or try again later.",
                status=status,
            )
        message = f"OrcaRouter could not exchange the code (HTTP {status})."
        if detail:
            message = f"{message} {detail}"
        return OrcaRouterAuthError(message, status=status, terminal=400 <= status < 500)


def _safe_error_body(response: Any) -> Optional[str]:
    """Extract the provider's short ``error_description``, and nothing else.

    Never echo a whole response body: an error path is exactly where a token
    would end up in a log. Only the two documented OAuth error fields are read,
    and they are length-capped.
    """
    try:
        body = response.json()
    except Exception:
        return None
    if not isinstance(body, dict):
        return None
    for field_name in ("error_description", "error"):
        value = body.get(field_name)
        if isinstance(value, str) and value:
            return value[:200]
    return None


async def wait_for_cancel(attempt_id: str, manager: PkceConnectManager) -> None:
    """Small helper for callers that poll an attempt to completion."""
    while manager.is_current(attempt_id):
        await asyncio.sleep(0.25)
