from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from flowsint_core.core.auth import verify_password
from flowsint_core.core.auth import create_access_token, get_password_hash
from sqlalchemy.orm import Session
from app.api.schemas.profile import ProfileCreate
from app.models.models import Profile
from flowsint_core.core.postgre_db import get_db

router = APIRouter()


@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(Profile).filter(Profile.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "user_id": user.id, "token_type": "bearer"}


@router.post("/register", status_code=201)
def register(user: ProfileCreate, db: Session = Depends(get_db)):
    print(user)
    existing_user = db.query(Profile).filter(Profile.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    new_user = Profile(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully", "email": new_user.email}
