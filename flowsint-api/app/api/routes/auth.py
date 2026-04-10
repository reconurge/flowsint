from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List

from flowsint_core.core.services import (
    create_auth_service,
    AuthenticationError,
    ConflictError,
    DatabaseError,
)
from flowsint_core.core.models import Profile
from flowsint_core.core.postgre_db import get_db
from app.api.schemas.profile import ProfileCreate, ProfileRead, ProfileUpdate
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    service = create_auth_service(db)
    try:
        return service.authenticate(form_data.username, form_data.password)
    except AuthenticationError:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    except (DatabaseError, SQLAlchemyError) as e:
        print(f"[ERROR] DB error during login: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/register", status_code=201)
def register(user: ProfileCreate, db: Session = Depends(get_db)):
    service = create_auth_service(db)
    try:
        return service.register(user.email, user.password)
    except ConflictError:
        raise HTTPException(status_code=400, detail="Email already registered")
    except (DatabaseError, SQLAlchemyError) as e:
        print(f"[ERROR] DB error during registration: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/me", response_model=ProfileRead)
def get_me(current_user: Profile = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=ProfileRead)
def update_me(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/users/search", response_model=List[ProfileRead])
def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Search users by email prefix for the share dialog autocomplete."""
    results = (
        db.query(Profile)
        .filter(
            Profile.email.ilike(f"{q}%"),
            Profile.id != current_user.id,
        )
        .limit(5)
        .all()
    )
    return results
