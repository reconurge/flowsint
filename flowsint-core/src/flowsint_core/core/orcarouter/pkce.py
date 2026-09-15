"""PKCE (RFC 7636) and OAuth ``state`` primitives for the OrcaRouter connect flow.

The verifier is the only thing binding an authorization code to this process —
anyone who intercepts the code cannot redeem it without it. It therefore:

* comes from a cryptographic RNG, fresh for every attempt;
* uses the unreserved base64url alphabet with padding stripped, as RFC 7636
  requires;
* never leaves the process until the exchange request body, and is never put in
  a URL, log line, or error message.

Everything here is standard library — no dependency is added for SHA-256 or
base64url.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

#: Bytes of entropy drawn from the CSPRNG for a code verifier.
#: 32 bytes -> 43 base64url characters, exactly RFC 7636's minimum length.
VERIFIER_BYTES = 32

#: Bytes of entropy for the opaque ``state`` CSRF token.
STATE_BYTES = 16

#: The only challenge method this client sends. ``plain`` is never used: a code
#: delivered to a human (Flow B, or Flow A's "show me a code") would otherwise
#: be redeemable by anyone who can read the authorize URL out of browser
#: history, a proxy, or a request log.
CODE_CHALLENGE_METHOD = "S256"


def b64url(raw: bytes) -> str:
    """base64url without padding — the encoding RFC 7636 mandates."""
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def generate_verifier() -> str:
    """A fresh high-entropy code verifier, from the cryptographic RNG."""
    return b64url(secrets.token_bytes(VERIFIER_BYTES))


def generate_state() -> str:
    """A fresh opaque ``state`` value, from the cryptographic RNG."""
    return b64url(secrets.token_bytes(STATE_BYTES))


def code_challenge(verifier: str) -> str:
    """``base64url(sha256(verifier))`` with no padding."""
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return b64url(digest)


def state_matches(expected: str, received: str | None) -> bool:
    """Constant-time comparison of the echoed ``state``.

    A normal ``==`` on the CSRF token leaks its prefix through timing. The
    token is also the only thing standing between the callback and a code some
    other page dropped on it, so the comparison must not short-circuit.
    """
    if not expected or not received:
        return False
    return hmac.compare_digest(expected, received)
