"""
Type registry service for managing flowsint types.
"""

from typing import Any, Dict, List, Optional, Type
from uuid import UUID, uuid4

from sqlalchemy.orm import Session
from pydantic import BaseModel, TypeAdapter

from ..models import CustomType
from .base import BaseService


class TypeRegistryService(BaseService):
    """
    Service for type registry operations and schema extraction.
    """

    def get_types_list(self, user_id: UUID) -> List[Dict[str, Any]]:
        """
        Get the complete types list for sketches.

        Args:
            user_id: The user's ID

        Returns:
            List of type categories with their children
        """
        from flowsint_types.registry import get_type

        # Define categories with type names
        category_definitions = self._get_category_definitions()

        types = []
        for category in category_definitions:
            category_copy = category.copy()
            children_schemas = []

            for child_def in category["children"]:
                type_name, label_key, icon = child_def
                model = get_type(type_name, case_sensitive=True)

                if model:
                    children_schemas.append(
                        self._extract_input_schema(model, label_key=label_key, icon=icon)
                    )
                else:
                    print(f"Warning: Type {type_name} not found in TYPE_REGISTRY")

            category_copy["children"] = children_schemas
            types.append(category_copy)

        # Add custom types
        custom_types = (
            self._db.query(CustomType)
            .filter(
                CustomType.owner_id == user_id,
                CustomType.status == "published",
            )
            .all()
        )

        if custom_types:
            custom_types_children = []
            for custom_type in custom_types:
                schema = custom_type.schema
                properties = schema.get("properties", {})
                required = schema.get("required", [])

                label_key = (
                    required[0]
                    if required
                    else list(properties.keys())[0]
                    if properties
                    else "value"
                )

                custom_types_children.append(
                    {
                        "id": custom_type.id,
                        "type": custom_type.name,
                        "key": custom_type.name.lower(),
                        "label_key": label_key,
                        "icon": "custom",
                        "label": custom_type.name,
                        "description": custom_type.description or "",
                        "fields": [
                            {
                                "name": prop,
                                "label": info.get("title", prop),
                                "description": info.get("description", ""),
                                "type": "text",
                                "required": prop in required,
                            }
                            for prop, info in properties.items()
                        ],
                        "custom": True,
                    }
                )

            types.append(
                {
                    "id": uuid4(),
                    "type": "custom_types_category",
                    "key": "custom_types",
                    "icon": "custom",
                    "label": "Custom types",
                    "fields": [],
                    "children": custom_types_children,
                }
            )

        return types

    def _get_category_definitions(self) -> List[Dict[str, Any]]:
        """Get the category definitions for types."""
        return [
            {
                "id": uuid4(),
                "type": "global",
                "key": "global_category",
                "icon": "phrase",
                "label": "Global",
                "fields": [],
                "children": [
                    ("Phrase", "text", None),
                    ("Location", "address", None),
                ],
            },
            {
                "id": uuid4(),
                "type": "person",
                "key": "person_category",
                "icon": "individual",
                "label": "Identities & Entities",
                "fields": [],
                "children": [
                    ("Individual", "full_name", None),
                    ("Username", "value", "username"),
                    ("Organization", "name", None),
                ],
            },
            {
                "id": uuid4(),
                "type": "organization",
                "key": "organization_category",
                "icon": "organization",
                "label": "Organization",
                "fields": [],
                "children": [
                    ("Organization", "name", None),
                ],
            },
            {
                "id": uuid4(),
                "type": "contact_category",
                "key": "contact",
                "icon": "phone",
                "label": "Communication & Contact",
                "fields": [],
                "children": [
                    ("Phone", "number", None),
                    ("Email", "email", None),
                    ("Username", "value", None),
                    ("SocialAccount", "username", "socialaccount"),
                    ("Message", "content", "message"),
                ],
            },
            {
                "id": uuid4(),
                "type": "network_category",
                "key": "network",
                "icon": "domain",
                "label": "Network",
                "fields": [],
                "children": [
                    ("ASN", "number", None),
                    ("CIDR", "network", None),
                    ("Domain", "domain", None),
                    ("Website", "url", None),
                    ("Ip", "address", None),
                    ("Port", "number", None),
                    ("DNSRecord", "name", "dns"),
                    ("SSLCertificate", "subject", "ssl"),
                    ("WebTracker", "name", "webtracker"),
                ],
            },
            {
                "id": uuid4(),
                "type": "security_category",
                "key": "security",
                "icon": "credential",
                "label": "Security & Access",
                "fields": [],
                "children": [
                    ("Credential", "username", "credential"),
                    ("Session", "session_id", "session"),
                    ("Device", "device_id", "device"),
                    ("Malware", "name", "malware"),
                    ("Weapon", "name", "weapon"),
                ],
            },
            {
                "id": uuid4(),
                "type": "files_category",
                "key": "files",
                "icon": "file",
                "label": "Files & Documents",
                "fields": [],
                "children": [
                    ("Document", "title", "document"),
                    ("File", "filename", "file"),
                ],
            },
            {
                "id": uuid4(),
                "type": "financial_category",
                "key": "financial",
                "icon": "creditcard",
                "label": "Financial Data",
                "fields": [],
                "children": [
                    ("BankAccount", "account_number", "creditcard"),
                    ("CreditCard", "card_number", "creditcard"),
                ],
            },
            {
                "id": uuid4(),
                "type": "leak_category",
                "key": "leaks",
                "icon": "breach",
                "label": "Leaks",
                "fields": [],
                "children": [
                    ("Leak", "name", "breach"),
                ],
            },
            {
                "id": uuid4(),
                "type": "crypto_category",
                "key": "crypto",
                "icon": "cryptowallet",
                "label": "Crypto",
                "fields": [],
                "children": [
                    ("CryptoWallet", "address", "cryptowallet"),
                    ("CryptoWalletTransaction", "hash", "cryptowallet"),
                    ("CryptoNFT", "name", "cryptowallet"),
                ],
            },
        ]

    def _extract_input_schema(
        self, model: Type[BaseModel], label_key: str, icon: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract input schema from a Pydantic model."""
        adapter = TypeAdapter(model)
        schema = adapter.json_schema()
        type_name = model.__name__
        details = schema

        return {
            "id": uuid4(),
            "type": type_name,
            "key": type_name.lower(),
            "label_key": label_key,
            "icon": icon or type_name.lower(),
            "label": type_name,
            "description": details.get("description", ""),
            "fields": [
                self._resolve_field(prop, details=info, schema=schema)
                for prop, info in details.get("properties", {}).items()
                if prop != "nodeLabel"
            ],
        }

    def _resolve_field(
        self, prop: str, details: dict, schema: dict = None
    ) -> Dict[str, Any]:
        """Resolve a field definition from schema."""
        field = {
            "name": prop,
            "label": details.get("title", prop),
            "description": details.get("description", ""),
            "type": "text",
        }

        if self._has_enum(details):
            field["type"] = "select"
            field["options"] = [
                {"label": label, "value": label}
                for label in self._get_enum_values(details)
            ]

        field["required"] = self._is_required(details)
        return field

    def _has_enum(self, schema: dict) -> bool:
        """Check if schema has enum values."""
        any_of = schema.get("anyOf", [])
        return any(isinstance(entry, dict) and "enum" in entry for entry in any_of)

    def _is_required(self, schema: dict) -> bool:
        """Check if field is required."""
        any_of = schema.get("anyOf", [])
        return not any(entry == {"type": "null"} for entry in any_of)

    def _get_enum_values(self, schema: dict) -> list:
        """Get enum values from schema."""
        enum_values = []
        for entry in schema.get("anyOf", []):
            if isinstance(entry, dict) and "enum" in entry:
                enum_values.extend(entry["enum"])
        return enum_values


def create_type_registry_service(db: Session) -> TypeRegistryService:
    """
    Factory function to create a TypeRegistryService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured TypeRegistryService instance
    """
    return TypeRegistryService(db=db)
