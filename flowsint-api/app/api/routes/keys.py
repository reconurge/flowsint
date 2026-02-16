from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from flowsint_core.core.models import Profile
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.services import (
    DatabaseError,
    NotFoundError,
    create_key_service,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.key import KeyCreate, KeyExists, KeyRead

router = APIRouter()


@router.get("", response_model=List[KeyRead])
def get_keys(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    service = create_key_service(db)
    keys = service.get_keys_for_user(current_user.id)
    return [
        KeyRead(
            id=key.id,
            owner_id=key.owner_id,
            name=key.name,
            created_at=key.created_at,
        )
        for key in keys
    ]


@router.get("/chat-key-exists", response_model=KeyExists)
def chat_key_exists(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    A simple util route to know if any ai chat key exists in the vault for this user
    """
    service = create_key_service(db)
    try:
        key_exists = service.chat_key_exist(current_user.id)
        return KeyExists(exists=key_exists)
    except NotFoundError as e:
        print(e)
        return KeyExists(exists=False)


@router.get("/{id}", response_model=KeyRead)
def get_key_by_id(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_key_service(db)
    try:
        key = service.get_key_by_id(id, current_user.id)
        return KeyRead(
            id=key.id,
            owner_id=key.owner_id,
            name=key.name,
            created_at=key.created_at,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Key not found")


@router.post("/create", response_model=KeyRead, status_code=status.HTTP_201_CREATED)
def create_key(
    payload: KeyCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_key_service(db)
    try:
        key = service.create_key(payload.name, payload.key, current_user.id)
        return KeyRead(
            id=key.id,
            owner_id=key.owner_id,
            name=key.name,
            created_at=key.created_at,
        )
    except DatabaseError:
        raise HTTPException(
            status_code=500, detail="An error occurred creating the key."
        )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_key(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_key_service(db)
    try:
        service.delete_key(id, current_user.id)
        return None
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Key not found")
