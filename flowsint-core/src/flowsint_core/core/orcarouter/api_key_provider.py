"""The two credential adapters behind the :class:`CredentialProvider` seam.

* :class:`ApiKeyCredentialProvider` — the user pastes an ``sk-orca-…`` key.
* :class:`PkceCredentialProvider` — the user authorizes in a browser and the
  code is exchanged for a key.

Both persist through the same store and return the same
:class:`CredentialResult`, so the provider, the model catalog, and every AI
entry point stay ignorant of which one ran.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from .credentials import (
    CredentialResult,
    CredentialSource,
    validate_api_key_shape,
)
from .store import CredentialStore


class ApiKeyCredentialProvider:
    """The "OrcaRouter - API" entry: an existing key, pasted by the user.

    Serves users who already have a key, who are running headless, or who simply
    do not want to sign in. It must keep working exactly as before when the PKCE
    path is added — replacing a working API-key entry with a browser flow is a
    regression for every one of those users.
    """

    source = CredentialSource.API_KEY

    def __init__(self, store: CredentialStore) -> None:
        self._store = store

    def is_configured(self, owner_id: UUID) -> bool:
        return self._store.current_api_key(owner_id) is not None

    def current(self, owner_id: UUID) -> Optional[CredentialResult]:
        return self._store.load(owner_id)

    def save(self, owner_id: UUID, raw_key: str) -> CredentialResult:
        """Validate the shape, then store the key.

        Format checking only — an ``sk-orca-`` prefix does not prove the key
        works, and OrcaRouter exposes no free validation endpoint, so validity is
        established by the first real request rather than by a paid probe.
        """
        key = validate_api_key_shape(raw_key)
        return self._store.save(owner_id, key, CredentialSource.API_KEY)

    def clear(self, owner_id: UUID) -> None:
        self._store.clear(owner_id)
