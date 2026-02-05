"""
Custom type service for managing user-defined types.
"""

from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from ..models import CustomType
from .base import BaseService
from .exceptions import NotFoundError, ValidationError, ConflictError


class CustomTypeService(BaseService):
    """
    Service for custom type CRUD operations and validation.
    """

    def list_custom_types(
        self, user_id: UUID, status: Optional[str] = None
    ) -> List[CustomType]:
        """
        List all custom types for a user.

        Args:
            user_id: The user's ID
            status: Optional status filter (draft, published, archived)

        Returns:
            List of custom types

        Raises:
            ValidationError: If invalid status provided
        """
        query = self._db.query(CustomType).filter(CustomType.owner_id == user_id)

        if status:
            if status not in ["draft", "published", "archived"]:
                raise ValidationError(
                    "Status must be one of: draft, published, archived"
                )
            query = query.filter(CustomType.status == status)

        return query.order_by(CustomType.created_at.desc()).all()

    def get_by_id(self, custom_type_id: UUID, user_id: UUID) -> CustomType:
        """
        Get a custom type by ID.

        Args:
            custom_type_id: The custom type ID
            user_id: The user's ID

        Returns:
            The custom type

        Raises:
            NotFoundError: If custom type not found
        """
        custom_type = (
            self._db.query(CustomType)
            .filter(CustomType.id == custom_type_id, CustomType.owner_id == user_id)
            .first()
        )
        if not custom_type:
            raise NotFoundError("Custom type not found")
        return custom_type

    def get_schema(self, custom_type_id: UUID, user_id: UUID) -> Dict[str, Any]:
        """
        Get the raw JSON Schema for a custom type.

        Args:
            custom_type_id: The custom type ID
            user_id: The user's ID

        Returns:
            The JSON schema

        Raises:
            NotFoundError: If custom type not found
        """
        custom_type = self.get_by_id(custom_type_id, user_id)
        return custom_type.schema

    def create(
        self,
        name: str,
        json_schema: Dict[str, Any],
        user_id: UUID,
        description: Optional[str] = None,
        status: str = "draft",
        validate_schema_func=None,
        calculate_checksum_func=None,
    ) -> CustomType:
        """
        Create a new custom type.

        Args:
            name: Type name
            json_schema: The JSON Schema
            user_id: The owner's ID
            description: Optional description
            status: Initial status (default: draft)
            validate_schema_func: Function to validate JSON schema
            calculate_checksum_func: Function to calculate schema checksum

        Returns:
            The created custom type

        Raises:
            ValidationError: If schema is invalid
            ConflictError: If name already exists
        """
        # Validate the JSON Schema
        if validate_schema_func:
            validate_schema_func(json_schema)

        # Calculate checksum
        checksum = calculate_checksum_func(json_schema) if calculate_checksum_func else None

        # Check for duplicate name for this user
        existing = (
            self._db.query(CustomType)
            .filter(CustomType.owner_id == user_id, CustomType.name == name)
            .first()
        )
        if existing:
            raise ConflictError(f"Custom type with name '{name}' already exists")

        # Create the custom type
        db_custom_type = CustomType(
            name=name,
            owner_id=user_id,
            schema=json_schema,
            description=description,
            status=status,
            checksum=checksum,
        )

        self._add(db_custom_type)
        self._commit()
        self._refresh(db_custom_type)

        return db_custom_type

    def update(
        self,
        custom_type_id: UUID,
        user_id: UUID,
        name: Optional[str] = None,
        json_schema: Optional[Dict[str, Any]] = None,
        description: Optional[str] = None,
        status: Optional[str] = None,
        validate_schema_func=None,
        calculate_checksum_func=None,
    ) -> CustomType:
        """
        Update a custom type.

        Args:
            custom_type_id: The custom type ID
            user_id: The user's ID
            name: New name (optional)
            json_schema: New schema (optional)
            description: New description (optional)
            status: New status (optional)
            validate_schema_func: Function to validate JSON schema
            calculate_checksum_func: Function to calculate schema checksum

        Returns:
            The updated custom type

        Raises:
            NotFoundError: If custom type not found
            ValidationError: If schema is invalid
            ConflictError: If name already exists
        """
        custom_type = self.get_by_id(custom_type_id, user_id)

        if name is not None:
            # Check for duplicate name
            existing = (
                self._db.query(CustomType)
                .filter(
                    CustomType.owner_id == user_id,
                    CustomType.name == name,
                    CustomType.id != custom_type_id,
                )
                .first()
            )
            if existing:
                raise ConflictError(f"Custom type with name '{name}' already exists")
            custom_type.name = name

        if json_schema is not None:
            if validate_schema_func:
                validate_schema_func(json_schema)
            custom_type.schema = json_schema
            if calculate_checksum_func:
                custom_type.checksum = calculate_checksum_func(json_schema)

        if description is not None:
            custom_type.description = description

        if status is not None:
            custom_type.status = status

        self._commit()
        self._refresh(custom_type)

        return custom_type

    def delete(self, custom_type_id: UUID, user_id: UUID) -> None:
        """
        Delete a custom type.

        Args:
            custom_type_id: The custom type ID
            user_id: The user's ID

        Raises:
            NotFoundError: If custom type not found
        """
        custom_type = self.get_by_id(custom_type_id, user_id)
        self._delete(custom_type)
        self._commit()

    def validate_payload(
        self,
        custom_type_id: UUID,
        user_id: UUID,
        payload: Dict[str, Any],
        validate_payload_func=None,
    ) -> Tuple[bool, Optional[List[str]]]:
        """
        Validate a payload against a custom type's schema.

        Args:
            custom_type_id: The custom type ID
            user_id: The user's ID
            payload: The payload to validate
            validate_payload_func: Function to validate payload against schema

        Returns:
            Tuple of (is_valid, errors)

        Raises:
            NotFoundError: If custom type not found
        """
        custom_type = self.get_by_id(custom_type_id, user_id)

        if validate_payload_func:
            return validate_payload_func(payload, custom_type.schema)

        return True, None


def create_custom_type_service(db: Session) -> CustomTypeService:
    """
    Factory function to create a CustomTypeService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured CustomTypeService instance
    """
    return CustomTypeService(db=db)
