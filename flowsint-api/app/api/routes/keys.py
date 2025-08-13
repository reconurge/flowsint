from uuid import UUID, uuid4
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from sqlalchemy.orm import Session
from flowsint_core.core.postgre_db import get_db
from app.models.models import Profile, Key
from app.api.deps import get_current_user
from app.api.schemas.key import KeyRead, KeyCreate
from datetime import datetime

router = APIRouter()


def obfuscate_key(key: str) -> str:
    """Obfuscate a key by showing only the last 4 characters, replacing others with asterisks."""
    if len(key) <= 4:
        return key
    return "*" * (len(key) - 4) + key[-4:]


# Get the list of all keys for a user
@router.get("", response_model=List[KeyRead])
def get_keys(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    keys = db.query(Key).filter(Key.owner_id == current_user.id).all()
    response_data = [
        KeyRead(
            id=key.id,
            owner_id=key.owner_id,
            encrypted_key=obfuscate_key(key.encrypted_key),
            name=key.name,
            created_at=key.created_at,
        )
        for key in keys
    ]
    return response_data


# Get a key by ID
@router.get("/{id}", response_model=KeyRead)
def get_key_by_id(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    key = db.query(Key).filter(Key.id == id, Key.owner_id == current_user.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")

    # Create a response with obfuscated key
    response_data = KeyRead(
        id=key.id,
        owner_id=key.owner_id,
        encrypted_key=obfuscate_key(key.encrypted_key),
        name=key.name,
        created_at=key.created_at,
    )
    return response_data


# Create a new key
@router.post("/create", response_model=KeyRead, status_code=status.HTTP_201_CREATED)
def create_key(
    payload: KeyCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    new_key = Key(
        id=uuid4(),
        name=payload.name,
        owner_id=current_user.id,
        encrypted_key=payload.key,
        created_at=datetime.utcnow(),
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    return new_key


# Delete a key by ID
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_key(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    key = db.query(Key).filter(Key.id == id, Key.owner_id == current_user.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    db.delete(key)
    db.commit()
    return None
