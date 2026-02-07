"""
Vault service — single entry point for secret management.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from ..models import Key
from ..vault import Vault, VaultProtocol
from .base import BaseService


class VaultService(BaseService):
    """
    Wraps the Vault class and exposes service-level methods (with explicit
    owner_id) for use by other services, plus a ``for_user`` helper that
    returns a VaultProtocol-compatible object for enrichers.
    """

    def get_secret(self, owner_id: UUID, vault_ref: str) -> Optional[str]:
        return Vault(db=self._db, owner_id=owner_id).get_secret(vault_ref)

    def set_secret(self, owner_id: UUID, vault_ref: str, plain_key: str) -> Key:
        return Vault(db=self._db, owner_id=owner_id).set_secret(vault_ref, plain_key)

    def for_user(self, owner_id: UUID) -> VaultProtocol:
        return Vault(db=self._db, owner_id=owner_id)


def create_vault_service(db: Session) -> VaultService:
    return VaultService(db=db)
