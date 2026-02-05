"""
API key management service with Vault integration.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from ..models import Key
from ..vault import Vault
from .base import BaseService
from .exceptions import NotFoundError, DatabaseError


class KeyService(BaseService):
    """
    Service for API key management with encryption via Vault.
    """

    def get_keys_for_user(self, user_id: UUID) -> List[Key]:
        """
        Get all keys for a user.

        Args:
            user_id: The user's ID

        Returns:
            List of Key entities (without decrypted values)
        """
        return self._db.query(Key).filter(Key.owner_id == user_id).all()

    def get_key_by_id(self, key_id: UUID, user_id: UUID) -> Key:
        """
        Get a specific key by ID for a user.

        Args:
            key_id: The key's ID
            user_id: The user's ID (for ownership verification)

        Returns:
            The Key entity

        Raises:
            NotFoundError: If key not found or doesn't belong to user
        """
        key = (
            self._db.query(Key)
            .filter(Key.id == key_id, Key.owner_id == user_id)
            .first()
        )
        if not key:
            raise NotFoundError("Key not found")
        return key

    def create_key(self, name: str, key_value: str, user_id: UUID) -> Key:
        """
        Create a new encrypted API key.

        Args:
            name: Key name (e.g., "shodan", "whoxy")
            key_value: The plain text key value
            user_id: The owner's ID

        Returns:
            The created Key entity

        Raises:
            DatabaseError: If key creation fails
        """
        try:
            vault = Vault(db=self._db, owner_id=user_id)
            key = vault.set_secret(vault_ref=name, plain_key=key_value)
            if not key:
                raise DatabaseError("An error occurred creating the key")
            return key
        except Exception as e:
            raise DatabaseError(f"An error occurred creating the key: {e}")

    def delete_key(self, key_id: UUID, user_id: UUID) -> None:
        """
        Delete a key by ID.

        Args:
            key_id: The key's ID
            user_id: The user's ID (for ownership verification)

        Raises:
            NotFoundError: If key not found or doesn't belong to user
        """
        key = self.get_key_by_id(key_id, user_id)
        self._delete(key)
        self._commit()

    def get_decrypted_key(self, name_or_id: str, user_id: UUID) -> Optional[str]:
        """
        Get a decrypted key value by name or ID.

        Args:
            name_or_id: Either the key name or UUID
            user_id: The owner's ID

        Returns:
            The decrypted key value or None if not found
        """
        vault = Vault(db=self._db, owner_id=user_id)
        return vault.get_secret(name_or_id)


def create_key_service(db: Session) -> KeyService:
    """
    Factory function to create a KeyService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured KeyService instance
    """
    return KeyService(db=db)
