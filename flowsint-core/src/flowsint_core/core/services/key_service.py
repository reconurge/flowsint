"""
API key management service with Vault integration.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from ..models import Key
from ..repositories import KeyRepository
from .base import BaseService
from .exceptions import DatabaseError, NotFoundError


class keyService(BaseService):
    """
    Service for API key management with encryption via Vault.
    """

    def __init__(self, db: Session, key_repo: KeyRepository, vault_service, **kwargs):
        super().__init__(db, **kwargs)
        self._key_repo = key_repo
        self._vault_service = vault_service

    def get_keys_for_user(self, user_id: UUID) -> List[Key]:
        return self._key_repo.get_by_owner(user_id)

    def get_key_by_owner_and_name(self, user_id: UUID, name: str) -> Key | None:
        return self._key_repo.get_by_name_and_owner(user_id, name)

    def get_key_by_id(self, key_id: UUID, user_id: UUID) -> Key:
        key = self._key_repo.get_by_id_and_owner(key_id, user_id)
        if not key:
            raise NotFoundError("Key not found")
        return key

    def create_key(self, name: str, key_value: str, user_id: UUID) -> Key:
        try:
            key = self._vault_service.set_secret(
                user_id, vault_ref=name, plain_key=key_value
            )
            if not key:
                raise DatabaseError("An error occurred creating the key")
            return key
        except Exception as e:
            raise DatabaseError(f"An error occurred creating the key: {e}")

    def delete_key(self, key_id: UUID, user_id: UUID) -> None:
        key = self.get_key_by_id(key_id, user_id)
        self._key_repo.delete(key)
        self._commit()

    def get_decrypted_key(self, name_or_id: str, user_id: UUID) -> Optional[str]:
        return self._vault_service.get_secret(user_id, name_or_id)

    def chat_key_exist(self, user_id: UUID) -> bool:
        return self._key_repo.chat_key_exist(user_id)


def create_key_service(db: Session) -> keyService:
    from .vault_service import VaultService

    return keyService(
        db=db,
        key_repo=KeyRepository(db),
        vault_service=VaultService(db=db),
    )
