"""
Authentication service for user login and registration.
"""

from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..models import Profile
from ..auth import verify_password, create_access_token, get_password_hash
from ..repositories import ProfileRepository
from .base import BaseService
from .exceptions import AuthenticationError, ConflictError, DatabaseError


class AuthService(BaseService):
    """
    Service for user authentication and registration.
    """

    def __init__(self, db: Session, profile_repo: ProfileRepository, **kwargs):
        super().__init__(db, **kwargs)
        self._profile_repo = profile_repo

    def authenticate(self, email: str, password: str) -> Dict[str, Any]:
        user = self._profile_repo.get_by_email(email)

        if not user or not verify_password(password, user.hashed_password):
            raise AuthenticationError("Incorrect email or password")

        access_token = create_access_token(data={"sub": user.email})

        return {
            "access_token": access_token,
            "user_id": user.id,
            "token_type": "bearer",
        }

    def register(self, email: str, password: str) -> Dict[str, Any]:
        existing_user = self._profile_repo.get_by_email(email)

        if existing_user:
            raise ConflictError("Email already registered")

        hashed_password = get_password_hash(password)
        new_user = Profile(email=email, hashed_password=hashed_password)

        try:
            self._profile_repo.add(new_user)
            self._commit()
            self._refresh(new_user)

            return {
                "message": "User registered successfully",
                "email": new_user.email,
            }
        except IntegrityError:
            self._rollback()
            raise ConflictError("Email already registered")


def create_auth_service(db: Session) -> AuthService:
    return AuthService(
        db=db,
        profile_repo=ProfileRepository(db),
    )
