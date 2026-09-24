"""Error types for the OrcaRouter integration.

Every message in here is safe to surface to a user and to write to a log: none
of them interpolate an API key, an auth code, or a PKCE verifier. Anything that
arrives from the network is summarized into a status code plus the provider's
own short ``error``/``error_description`` fields, never echoed wholesale — a
response body is exactly where a leaked credential would show up.
"""

from __future__ import annotations

from typing import Optional


class OrcaRouterError(Exception):
    """Base class for every OrcaRouter failure."""


class OrcaRouterConfigError(OrcaRouterError, ValueError):
    """An OrcaRouter origin or option is unusable."""


class OrcaRouterAuthError(OrcaRouterError):
    """The connect flow could not produce a credential.

    ``terminal`` marks failures where retrying the same attempt cannot help
    (denial, expired or already-used code, state mismatch). Callers use it to
    decide between offering a retry and asking the user to start over.
    """

    def __init__(
        self,
        message: str,
        *,
        status: Optional[int] = None,
        error: Optional[str] = None,
        terminal: bool = False,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.error = error
        self.terminal = terminal


class OrcaRouterReauthRequired(OrcaRouterError):
    """The stored credential was rejected upstream and must be replaced.

    OrcaRouter issues a durable API key, not an access/refresh pair, so there is
    no refresh grant to run. A ``401`` is terminal: the account's credential
    generation is marked ``needs_reauth`` and stays unusable until a new login
    succeeds.
    """


class OrcaRouterCatalogError(OrcaRouterError):
    """Model discovery failed.

    Callers fall back to the verified seed catalog; this is never fatal to a
    request the user already started.
    """
