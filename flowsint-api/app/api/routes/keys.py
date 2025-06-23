from uuid import UUID, uuid4
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.postgre_db import get_db
from app.models.models import Profile, ThirdPartyKey
from app.api.deps import get_current_user
from app.api.schemas.key import ThirdPartyKeyRead, ThirdPartyKeyCreate
from datetime import datetime

router = APIRouter()

class ServiceInfo(BaseModel):
    service: str
    variable: str
    url: str
    active: bool

# Get the list of all services that require a key
@router.get("/services", response_model=List[ServiceInfo])
def get_services(db: Session = Depends(get_db)):
    services = [
        ServiceInfo(service="Mistral AI", variable="MISTRAL_API_KEY", url="https://mistral.ai/", active=True),
        ServiceInfo(service="Etherscan", variable="ETHERSCAN_API_KEY", url="https://etherscan.io/", active=True),
        ServiceInfo(service="HaveIBeenPwned", variable="HIBP_API_KEY", url="https://haveibeenpwned.com/", active=True),
        ServiceInfo(service="Onyphe", variable="ONYPHE_API_KEY", url="https://www.onyphe.io/", active=False),
        ServiceInfo(service="Shodan", variable="SHODAN_API_KEY", url="https://www.shodan.io/", active=False)
    ]
    return services

# Get the list of all keys for a user
@router.get("", response_model=List[ThirdPartyKeyRead])
def get_keys(db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    keys = db.query(ThirdPartyKey).filter(ThirdPartyKey.owner_id == current_user.id).all()
    return keys

# Get a key by ID
@router.get("/{id}", response_model=ThirdPartyKeyRead)
def get_key_by_id(id: UUID, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    key = db.query(ThirdPartyKey).filter(ThirdPartyKey.id == id, ThirdPartyKey.owner_id == current_user.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    return key

# Create a new key
@router.post("/create", response_model=ThirdPartyKeyRead, status_code=status.HTTP_201_CREATED)
def create_key(payload: ThirdPartyKeyCreate, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    new_key = ThirdPartyKey(
        id=uuid4(),
        service=payload.service,
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
def delete_key(id: UUID, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    key = db.query(ThirdPartyKey).filter(ThirdPartyKey.id == id, ThirdPartyKey.owner_id == current_user.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    db.delete(key)
    db.commit()
    return None
