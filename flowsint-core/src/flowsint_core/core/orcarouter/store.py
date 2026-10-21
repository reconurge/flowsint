"""Durable storage and lifecycle for an OrcaRouter credential.

Storage is the project's **existing** per-user vault
(:class:`flowsint_core.core.vault.Vault`) — AES-256-GCM with an HKDF-derived
per-user data key. No second credential store is introduced, and nothing here
writes a plaintext side file.

Lifecycle note that drives the whole module: OrcaRouter returns a durable API
key, **not** an access-token/refresh-token pair. There is no refresh endpoint.
So this store never schedules a refresh and never fabricates a refresh grant;
the stored key is reused until OrcaRouter revokes it, and a ``401`` is a
terminal reauthentication requirement rather than a retry signal.
"""

from __future__ import annotations

import hashlib
import threading
from typing import Any, Dict, Optional
from uuid import UUID

from ..vault import Vault
from .credentials import VAULT_KEY_NAME, CredentialResult, CredentialSource

#: Sentinel stored in place of the credential when an upstream ``401`` proves
#: the key is no longer accepted.
NEEDS_REAUTH = "needs_reauth"
ACTIVE = "active"


def _fingerprint(api_key: str) -> str:
    """A non-reversible fingerprint used to compare credentials.

    Lets the store decide "is the credential that just failed still the one I am
    holding?" without keeping a second copy of the key in memory or in a log.
    """
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()[:32]


class CredentialStore:
    """Reads and writes the OrcaRouter credential for one owner at a time.

    The store is deliberately owner-scoped per call rather than per instance, so
    a single instance can serve the whole process without ever holding more than
    one user's credential at once.
    """

    def __init__(
        self, db: Any, vault_service: Any = None, *, vault_cls: Any = Vault
    ) -> None:
        self._db = db
        self._vault_cls = vault_cls
        if vault_service is None:
            from ..services.vault_service import VaultService

            vault_service = VaultService(db=db)
        self._vault_service = vault_service

        # In-process credential generation + reauth bookkeeping. The authoritative
        # credential always lives in the vault; this only tracks which *generation*
        # of it is current, so a late failure from an old request cannot mark a
        # freshly reauthorized credential as broken.
        self._lock = threading.Lock()
        self._generation: Dict[str, int] = {}
        self._state: Dict[str, str] = {}
        self._state_fingerprint: Dict[str, Optional[str]] = {}
        self._source_map: Dict[str, str] = {}

    # ------------------------------------------------------------------ read

    def load(self, owner_id: UUID) -> Optional[CredentialResult]:
        """The stored credential, or ``None`` when the user has not connected.

        A credential already marked for reauthentication is still returned — the
        caller needs to know it exists in order to explain the state — but
        :meth:`needs_reauth` tells the caller not to use it.
        """
        raw = self._vault_service.get_secret(owner_id, VAULT_KEY_NAME)
        if not raw:
            return None
        if raw == NEEDS_REAUTH:
            # Only reachable if a marker was written directly; treat as absent
            # rather than handing a sentinel to an HTTP client.
            return None
        return CredentialResult(
            api_key=raw,
            source=self._source(owner_id),
            generation=self._generation.get(str(owner_id), 0),
        )

    def current_api_key(self, owner_id: UUID) -> Optional[str]:
        """Just the key, or ``None``.

        Returns ``None`` for a credential pending reauthentication so a caller
        cannot accidentally use a key known to be revoked.
        """
        if self.needs_reauth(owner_id):
            return None
        loaded = self.load(owner_id)
        return loaded.api_key if loaded else None

    # ----------------------------------------------------------------- write

    def save(
        self,
        owner_id: UUID,
        api_key: str,
        source: str = CredentialSource.API_KEY,
    ) -> CredentialResult:
        """Persist a credential and advance its generation.

        Replacing an existing credential is a single logical write: the stale
        row is removed first so the vault never holds two rows under the same
        name (``get_secret`` reads the first match, so a leftover row would
        silently shadow the new key).
        """
        key = str(owner_id)
        with self._lock:
            self._vault_service.delete_secret(owner_id, VAULT_KEY_NAME)
            self._vault_service.set_secret(owner_id, VAULT_KEY_NAME, api_key)
            generation = self._generation.get(key, 0) + 1
            self._generation[key] = generation
            # A fresh credential always clears a previous reauth requirement,
            # and its fingerprint becomes the only one allowed to trip it again.
            self._state[key] = ACTIVE
            self._state_fingerprint[key] = _fingerprint(api_key)
            self._source_map[key] = source
        return CredentialResult(api_key=api_key, source=source, generation=generation)

    def clear(self, owner_id: UUID) -> None:
        """Remove the stored credential.

        Only call this when the user asks to disconnect, or *after* a
        replacement credential has been stored successfully. Deleting
        speculatively before a new login succeeds turns a transient failure into
        irreversible account loss.
        """
        key = str(owner_id)
        with self._lock:
            self._vault_service.delete_secret(owner_id, VAULT_KEY_NAME)
            self._generation.pop(key, None)
            self._state.pop(key, None)
            self._state_fingerprint.pop(key, None)
            self._source_map.pop(key, None)

    # ------------------------------------------------------------- reauth

    def mark_rejected(self, owner_id: UUID, generation: Optional[int] = None) -> bool:
        """Record that upstream rejected this credential.

        Returns ``True`` only when the transition actually applied. If the
        caller's ``generation`` is stale — the user reauthorized while the
        rejected request was still in flight — the call is a no-op, so a late
        failure can never mark a brand-new credential as broken.

        This is *not* a refresh: a revoked OrcaRouter key cannot be renewed. The
        credential stays unusable until a new login succeeds.
        """
        key = str(owner_id)
        with self._lock:
            current = self._generation.get(key, 0)
            if generation is not None and generation != current:
                return False
            loaded = self._vault_service.get_secret(owner_id, VAULT_KEY_NAME)
            if loaded and self._state_fingerprint.get(key) not in (
                None,
                _fingerprint(loaded),
            ):
                # The stored credential is not the one this request used.
                return False
            self._state[key] = NEEDS_REAUTH
            self._state_fingerprint[key] = _fingerprint(loaded) if loaded else None
            return True

    def needs_reauth(self, owner_id: UUID) -> bool:
        """Whether the stored credential is known to be rejected."""
        return self._state.get(str(owner_id)) == NEEDS_REAUTH

    def credential_generation(self, owner_id: UUID) -> int:
        """The current generation for an owner.

        Callers snapshot this before an async request and pass it back to
        :meth:`mark_rejected` so the transition targets exactly the credential
        that made the rejected request.
        """
        return self._generation.get(str(owner_id), 0)

    # ------------------------------------------------------------- internal

    def _source(self, owner_id: UUID) -> str:
        return self._source_map.get(str(owner_id), CredentialSource.API_KEY)
