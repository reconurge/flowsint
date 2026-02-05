from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from flowsint_core.core.services import (
    create_auth_service,
    AuthenticationError,
    ConflictError,
    DatabaseError,
)
from app.api.schemas.profile import ProfileCreate
from flowsint_core.core.postgre_db import get_db

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
