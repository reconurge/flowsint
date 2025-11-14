from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from flowsint_core.core.auth import (
    verify_password,
    create_access_token,
    get_password_hash,
)
from app.api.schemas.profile import ProfileCreate
from flowsint_core.core.models import Profile
from flowsint_core.core.postgre_db import get_db

router = APIRouter()


@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    try:
        user = db.query(Profile).filter(Profile.email == form_data.username).first()

        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect email or password")

        access_token = create_access_token(data={"sub": user.email})
        return {
            "access_token": access_token,
            "user_id": user.id,
            "token_type": "bearer",
        }

    except SQLAlchemyError as e:
        # Log optionnel
        print(f"[ERROR] DB error during login: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/register", status_code=201)
def register(user: ProfileCreate, db: Session = Depends(get_db)):
    try:
        existing_user = db.query(Profile).filter(Profile.email == user.email).first()

        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed_password = get_password_hash(user.password)
        new_user = Profile(email=user.email, hashed_password=hashed_password)

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {
            "message": "User registered successfully",
            "email": new_user.email,
        }

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")

    except SQLAlchemyError as e:
        db.rollback()
        print(f"[ERROR] DB error during registration: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
