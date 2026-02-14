"""
Custom type service for managing user-defined types.
"""

from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from ..models import CustomType
from ..repositories import CustomTypeRepository
from .base import BaseService
from .exceptions import ConflictError, NotFoundError, ValidationError


class CustomTypeService(BaseService):
    """
    Service for custom type CRUD operations and validation.
    """

    def __init__(self, db: Session, custom_type_repo: CustomTypeRepository, **kwargs):
        super().__init__(db, **kwargs)
        self._custom_type_repo = custom_type_repo

    def list_custom_types(
        self, user_id: UUID, status: Optional[str] = None
    ) -> List[CustomType]:
        if status and status not in ["draft", "published", "archived"]:
            raise ValidationError("Status must be one of: draft, published, archived")
        return self._custom_type_repo.get_by_owner(user_id, status=status)

    def get_by_id(self, custom_type_id: UUID, user_id: UUID) -> CustomType:
        custom_type = self._custom_type_repo.get_by_id_and_owner(
            custom_type_id, user_id
        )
        if not custom_type:
            raise NotFoundError("Custom type not found")
        return custom_type

    def get_schema(self, custom_type_id: UUID, user_id: UUID) -> Dict[str, Any]:
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
        if validate_schema_func:
            validate_schema_func(json_schema)

        checksum = (
            calculate_checksum_func(json_schema) if calculate_checksum_func else None
        )

        existing = self._custom_type_repo.get_by_name_and_owner(name, user_id)
        if existing:
            raise ConflictError(f"Custom type with name '{name}' already exists")

        db_custom_type = CustomType(
            name=name,
            owner_id=user_id,
            schema=json_schema,
            description=description,
            status=status,
            checksum=checksum,
        )

        self._custom_type_repo.add(db_custom_type)
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
        color: Optional[str] = None,
        icon: Optional[str] = None,
        validate_schema_func=None,
        calculate_checksum_func=None,
    ) -> CustomType:
        custom_type = self.get_by_id(custom_type_id, user_id)

        if name is not None:
            existing = self._custom_type_repo.get_by_name_and_owner(name, user_id)
            if existing and existing.id != custom_type_id:
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

        if icon is not None:
            custom_type.icon = icon

        if color is not None:
            custom_type.color = color

        self._commit()
        self._refresh(custom_type)

        return custom_type

    def delete(self, custom_type_id: UUID, user_id: UUID) -> None:
        custom_type = self.get_by_id(custom_type_id, user_id)
        self._custom_type_repo.delete(custom_type)
        self._commit()

    def validate_payload(
        self,
        custom_type_id: UUID,
        user_id: UUID,
        payload: Dict[str, Any],
        validate_payload_func=None,
    ) -> Tuple[bool, Optional[List[str]]]:
        custom_type = self.get_by_id(custom_type_id, user_id)

        if validate_payload_func:
            return validate_payload_func(payload, custom_type.schema)

        return True, None


def create_custom_type_service(db: Session) -> CustomTypeService:
    return CustomTypeService(
        db=db,
        custom_type_repo=CustomTypeRepository(db),
    )
