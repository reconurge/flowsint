from typing import Protocol, Optional
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select
from .models import Key


class VaultProtocol(Protocol):
    def get_secret(self, vault_ref: str) -> Optional[str]: ...


class Vault(VaultProtocol):
    def __init__(self, db: Session, owner_id: uuid.UUID):
        if not owner_id:
            raise ValueError("owner_id is required to use the vault.")
        self.db = db
        self.owner_id = owner_id
        
    def set_secret(self, vault_ref, plain_key) -> None:
        try:
            ref_uuid = uuid.UUID(vault_ref)
            stmt = select(Key).where(Key.id == ref_uuid)
        except ValueError:
            stmt = select(Key).where(Key.name == vault_ref)
        stmt = stmt.where(Key.owner_id == self.owner_id)
        result = self.db.execute(stmt)
        row = result.scalars().first()
        return row.encrypted_key if row else None

    def get_secret(self, vault_ref: str) -> Optional[str]:
        try:
            ref_uuid = uuid.UUID(vault_ref)
            stmt = select(Key).where(Key.id == ref_uuid)
        except ValueError:
            stmt = select(Key).where(Key.name == vault_ref)
        stmt = stmt.where(Key.owner_id == self.owner_id)
        result = self.db.execute(stmt)
        row = result.scalars().first()
        return row.encrypted_key if row else None
