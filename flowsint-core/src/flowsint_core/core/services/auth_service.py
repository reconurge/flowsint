"""
Authentication service for user login and registration.
"""

from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..models import Profile
from ..auth import verify_password, create_access_token, get_password_hash
from .base import BaseService
from .exceptions import AuthenticationError, ConflictError, DatabaseError


class AuthService(BaseService):
    """
    Service for user authentication and registration.
    """

    def authenticate(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate a user and return an access token.

        Args:
            email: User's email
            password: User's password

        Returns:
            Dictionary containing access_token, user_id, and token_type

        Raises:
            AuthenticationError: If credentials are invalid
        """
        user = self._db.query(Profile).filter(Profile.email == email).first()

        if not user or not verify_password(password, user.hashed_password):
            raise AuthenticationError("Incorrect email or password")

        access_token = create_access_token(data={"sub": user.email})

        return {
            "access_token": access_token,
            "user_id": user.id,
            "token_type": "bearer",
        }

    def register(self, email: str, password: str) -> Dict[str, Any]:
        """
        Register a new user.

        Args:
            email: User's email
            password: User's password

        Returns:
            Dictionary containing success message and email

        Raises:
            ConflictError: If email is already registered
            DatabaseError: If database operation fails
        """
        existing_user = self._db.query(Profile).filter(Profile.email == email).first()

        if existing_user:
            raise ConflictError("Email already registered")

        hashed_password = get_password_hash(password)
        new_user = Profile(email=email, hashed_password=hashed_password)

        try:
            self._add(new_user)
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
    """
    Factory function to create an AuthService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured AuthService instance
    """
    return AuthService(db=db)
