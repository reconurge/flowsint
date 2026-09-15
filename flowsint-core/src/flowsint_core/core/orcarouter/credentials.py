"""The credential seam.

Two user-visible choices produce the *same* thing: a normal OrcaRouter API key
that belongs to the user.

======================  ====================  ===============================
Choice                  Provider ID           How the key is obtained
======================  ====================  ===============================
Paste an existing key   ``orcarouter``        the user already has an ``sk-orca-…``
Account login           ``orcarouter-oauth``  OAuth 2.0 + PKCE, browser consent
======================  ====================  ===============================

Both are adapters over :class:`CredentialSource`, and both produce a
:class:`CredentialResult`. Nothing downstream — the provider, the model catalog,
the capability filters, the chat entry point, the template generator — knows or
cares which adapter ran. That is the whole point of the seam: adding a third way
to obtain a key (a device grant, say) must not require touching a single
inference call site.

The IDs and labels also match the integration spec's suggested table, so an
operator reading OrcaRouter docs sees the same names in the UI.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Protocol, runtime_checkable

#: Provider IDs. ``orcarouter`` is the pasted-key entry, ``orcarouter-oauth``
#: the browser login. They are deliberately separate so support, logout, and
#: reauthentication stay unambiguous.
PROVIDER_ID_API_KEY = "orcarouter"
PROVIDER_ID_OAUTH = "orcarouter-oauth"

PROVIDER_LABEL_API_KEY = "OrcaRouter - API"
PROVIDER_LABEL_OAUTH = "OrcaRouter - Auth"

#: Where a key is stored in the existing per-user vault. Matches the repository's
#: documented ``<SERVICE>_API_KEY`` convention (``WHOXY_API_KEY``,
#: ``MISTRAL_API_KEY``, …) so enrichers and the chat probe agree on the name.
VAULT_KEY_NAME = "ORCAROUTER_API_KEY"

#: Environment fallback for headless/self-hosted deployments that would rather
#: not use the vault at all.
API_KEY_ENV_VAR = "ORCAROUTER_API_KEY"

#: The prefix every OrcaRouter key carries. Used only for an obvious-mistake
#: check on pasted input — it is not proof that a credential is valid, and the
#: integration must not send a billed request just to make a form look green.
API_KEY_PREFIX = "sk-orca-"


class CredentialSource:
    """Where a credential came from.

    Recorded alongside the credential so the UI and the audit trail can tell the
    two choices apart after the fact, without either adapter leaking into
    downstream code.
    """

    API_KEY = "api_key"
    OAUTH_PKCE = "oauth_pkce"


@dataclass(frozen=True)
class CredentialResult:
    """A usable OrcaRouter credential plus where it came from.

    ``generation`` increments every time the stored credential for an account is
    replaced. It exists so a late ``401`` from a request made with an old
    credential cannot mark a freshly reauthorized one as broken: the reauth
    transition applies only when the rejected request's generation is still the
    current one.
    """

    api_key: str
    source: str
    generation: int = 0

    def __repr__(self) -> str:  # pragma: no cover - trivial, but load-bearing
        # Never let a credential reach a log through a stray f-string or a
        # traceback that formats locals.
        return (
            f"CredentialResult(api_key={redact(self.api_key)}, "
            f"source={self.source!r}, generation={self.generation})"
        )

    __str__ = __repr__


def redact(value: Optional[str]) -> str:
    """Render a secret safe for logs, errors, and UI.

    Shows just enough to let a user confirm *which* key is installed without
    disclosing it: the documented prefix plus the last four characters.
    """
    if not value:
        return "<unset>"
    if len(value) <= 8:
        return "•" * len(value)
    return f"{value[:8]}{'•' * 8}{value[-4:]}"


@runtime_checkable
class CredentialProvider(Protocol):
    """One way of obtaining an OrcaRouter credential.

    Implemented by the pasted-key adapter and the PKCE adapter. A caller that
    only needs "a key, any key" depends on this and on nothing else.
    """

    #: ``CredentialSource.API_KEY`` or ``CredentialSource.OAUTH_PKCE``.
    source: str

    def is_configured(self) -> bool:
        """Whether a usable credential is already stored for this account."""
        ...

    def current(self) -> Optional[CredentialResult]:
        """The stored credential, or ``None`` if there is not one."""
        ...

    def clear(self) -> None:
        """Remove the stored credential.

        Must not be called speculatively before a replacement login succeeds —
        a transient upstream failure would then become irreversible account
        loss.
        """
        ...


def validate_api_key_shape(raw: str) -> str:
    """Lightweight format check on a pasted key.

    Catches the obvious mistakes (empty input, a key pasted with surrounding
    whitespace, a different provider's key) and nothing more. An
    ``sk-orca-`` prefix is not evidence that a credential works; the first real
    request is what establishes validity.
    """
    value = (raw or "").strip()
    if not value:
        raise ValueError("API key is empty")
    if any(ch.isspace() for ch in value):
        raise ValueError("API key contains whitespace")
    if not value.startswith(API_KEY_PREFIX):
        raise ValueError(
            f"OrcaRouter API keys start with {API_KEY_PREFIX!r}. "
            "Create one at https://www.orcarouter.ai/console/authorized-apps"
        )
    return value
