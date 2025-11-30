from typing import Any, Dict, Optional, Type
from uuid import uuid4
from fastapi import APIRouter, Depends
from pydantic import BaseModel, TypeAdapter
from sqlalchemy.orm import Session
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import CustomType, Profile
from app.api.deps import get_current_user
from flowsint_types.registry import get_type

router = APIRouter()


# Helper function to get a type by name from the registry
def get_type_from_registry(type_name: str) -> Optional[Type[BaseModel]]:
    """Get a type from the TYPE_REGISTRY by name."""
    return get_type(type_name, case_sensitive=True)


# Returns the "types" for the sketches
@router.get("/")
async def get_types_list(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    # Define categories with type names to look up in TYPE_REGISTRY
    # Format: (type_name, label_key, optional_icon)
    category_definitions = [
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

    # Build the types list by looking up each type in TYPE_REGISTRY
    types = []
    for category in category_definitions:
        category_copy = category.copy()
        children_schemas = []

        for child_def in category["children"]:
            type_name, label_key, icon = child_def
            model = get_type_from_registry(type_name)

            if model:
                children_schemas.append(
                    extract_input_schema(model, label_key=label_key, icon=icon)
                )
            else:
                # Log warning but continue - type might not be available
                print(f"Warning: Type {type_name} not found in TYPE_REGISTRY")

        category_copy["children"] = children_schemas
        types.append(category_copy)

    # Add custom types
    custom_types = (
        db.query(CustomType)
        .filter(
            CustomType.owner_id == current_user.id,
            CustomType.status == "published",  # Only show published custom types
        )
        .all()
    )

    if custom_types:
        custom_types_children = []
        for custom_type in custom_types:
            # Extract the label_key from the schema (use first required field or first property)
            schema = custom_type.schema
            properties = schema.get("properties", {})
            required = schema.get("required", [])

            # Try to use the first required field, or the first property
            label_key = (
                required[0]
                if required
                else list(properties.keys())[0] if properties else "value"
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
                    "custom": True,  # Mark as custom type
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


def extract_input_schema(
    model: Type[BaseModel], label_key: str, icon: Optional[str] = None
) -> Dict[str, Any]:

    adapter = TypeAdapter(model)
    schema = adapter.json_schema()
    # Use the main schema properties, not the $defs
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
            resolve_field(prop, details=info, schema=schema)
            for prop, info in details.get("properties", {}).items()
            # exclude label from properties to fill
            if prop != "label"
        ],
    }


def resolve_field(prop: str, details: dict, schema: dict = None) -> Dict:
    """_summary_
    The fields can sometimes contain nested complex objects, like:
    - Organization having Individual[] as dirigeants, so we want to skip those.
    Args:
        details (dict): _description_
        schema_context (dict, optional): _description_. Defaults to None.

    Returns:
        str: _description_
    """
    field = {
        "name": prop,
        "label": details.get("title", prop),
        "description": details.get("description", ""),
        "type": "text",
    }
    if has_enum(details):
        field["type"] = "select"
        field["options"] = [
            {"label": label, "value": label} for label in get_enum_values(details)
        ]
    field["required"] = is_required(details)

    return field


def has_enum(schema: dict) -> bool:
    any_of = schema.get("anyOf", [])
    return any(isinstance(entry, dict) and "enum" in entry for entry in any_of)


def is_required(schema: dict) -> bool:
    any_of = schema.get("anyOf", [])
    return not any(entry == {"type": "null"} for entry in any_of)


def get_enum_values(schema: dict) -> list:
    enum_values = []
    for entry in schema.get("anyOf", []):
        if isinstance(entry, dict) and "enum" in entry:
            enum_values.extend(entry["enum"])
    return enum_values
