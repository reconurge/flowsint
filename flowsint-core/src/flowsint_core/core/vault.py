from ast import Str
import os
from typing import Protocol, Optional
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select
from .models import Key
from datetime import datetime
import base64
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from dotenv import load_dotenv

load_dotenv()


class VaultProtocol(Protocol):
    def get_secret(self, vault_ref: str) -> Optional[str]: ...
    def set_secret(self, vault_ref: str, plain_key: str) -> Key: ...


class Vault(VaultProtocol):
    def __init__(self, db: Session, owner_id: uuid.UUID):
        if not owner_id:
            raise ValueError("owner_id is required to use the vault.")
        self.db = db
        self.owner_id = str(owner_id)
        self.version = "V1"

    def _get_master_key(self) -> bytes:
        """
        Retrieve the master key
        """
        raw = os.getenv(f"MASTER_VAULT_KEY_{self.version}")
        if raw is None:
            raise ValueError(f"Missing master key {self.version}")

        if raw.startswith("base64:"):
            raw = raw[7:]

        key = base64.b64decode(raw)
        if len(key) != 32:
            raise ValueError("Master key must be 32 bytes (256 bits)")
        return key

    def _derive_user_data_key(self, master_key: bytes, salt: bytes) -> bytes:
        """
        Derives an AES-256 from master key, a salt and a context (user_id).
        """
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            info=self.owner_id.encode("utf-8"),
        )
        master_key = self._get_master_key()
        return hkdf.derive(master_key)

    def _encrypt_key(self, plaintext: str):
        """
        Encrypts a secret with AES-256-GCM + HKDF.
        Returns iv, salt, ciphertext+tag, key version.
        """
        master = self._get_master_key()
        salt = os.urandom(16)
        iv = os.urandom(12)

        data_key = self._derive_user_data_key(master, salt)

        aesgcm = AESGCM(data_key)
        ciphertext = aesgcm.encrypt(
            iv,
            plaintext.encode("utf-8"),
            self.owner_id.encode("utf-8"),  # AAD = links secret to user_id
        )

        return {
            "ciphertext": ciphertext,
            "iv": iv,
            "salt": salt,
        }

    def _decrypt_key(self, row: dict) -> str:
        """
        Decrypts a secret stored in db.
        """
        master = self._get_master_key()
        data_key = self._derive_user_data_key(master, row.get("salt"))

        aesgcm = AESGCM(data_key)
        plaintext = aesgcm.decrypt(
            row.get("iv"),
            row.get("ciphertext"),
            self.owner_id.encode("utf-8"),
        )
        return plaintext.decode("utf-8")

    def set_secret(self, vault_ref: str, plain_key: str) -> Key:
        """_summary_

        Args:
            vault_ref (str): key name (ex: shodan, whoxy)
            plain_key (str): actual key

        Returns:
            Key: pydantic key_object
        """
        encrypted_key_dict = self._encrypt_key(plain_key)
        new_key = Key(
            id=uuid.uuid4(),
            name=vault_ref,
            iv=encrypted_key_dict.get("iv"),
            salt=encrypted_key_dict.get("salt"),
            key_version=self.version,
            owner_id=self.owner_id,
            ciphertext=encrypted_key_dict.get("ciphertext"),
            created_at=datetime.utcnow(),
        )
        self.db.add(new_key)
        self.db.commit()
        self.db.refresh(new_key)
        return new_key

    def get_secret(self, vault_ref: str) -> Optional[str]:
        """Get a secret from the vault by ID or name.

        Args:
            vault_ref (str): Either a UUID (key ID) or a string (key name)

        Returns:
            Optional[str]: The decrypted secret value, or None if not found
        """
        try:
            ref_uuid = uuid.UUID(vault_ref)
            stmt = select(Key).where(Key.id == ref_uuid)
        except ValueError:
            stmt = select(Key).where(Key.name == vault_ref)

        stmt = stmt.where(Key.owner_id == self.owner_id)
        result = self.db.execute(stmt)
        row = result.scalars().first()

        if row:
            # Convert SQLAlchemy model to dict for decryption
            row_dict = {
                "salt": row.salt,
                "iv": row.iv,
                "ciphertext": row.ciphertext,
            }
            decrypted_key = self._decrypt_key(row_dict)
            return decrypted_key
        else:
            return None
