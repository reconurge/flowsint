from typing import Any, Dict, Optional, Type
from uuid import UUID, uuid4
from fastapi import APIRouter
from pydantic import BaseModel, TypeAdapter
from app.core.celery import celery
from app.types.domain import Domain
from app.types.ip import Ip
from app.types.social import SocialProfile
from app.types.organization import Organization
from app.types.email import Email
from app.types.asn import ASN
from app.types.cidr import CIDR
from app.types.wallet import CryptoWallet, CryptoWalletTransaction, CryptoNFT
from app.types.website import Website
from app.types.individual import Individual
from app.types.phone import Phone
from app.types.leak import Leak

router = APIRouter()

# Returns the "types" for the sketches
@router.get("/")
async def get_types_list():
    types = [
        {
            "id": uuid4(),
            "type": "person",
            "key": "person_category",
            "icon": "individual",
            "label": "Identities & Entities",
            "fields": [],
            "children": [
                extract_input_schema(Individual, label_key="full_name"),
                extract_input_schema(SocialProfile, label_key="username", icon="username"),
                extract_input_schema(Organization, label_key="name"),
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
                extract_input_schema(Organization, label_key="name"),
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
                extract_input_schema(Phone, label_key="number"),
                extract_input_schema(Email, label_key="email"),
                extract_input_schema(SocialProfile, label_key="username", icon="username"),
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
                extract_input_schema(ASN, label_key="number"),
                extract_input_schema(CIDR, label_key="network"),
                extract_input_schema(Domain, label_key="domain"),
                extract_input_schema(Website, label_key="url"),
                extract_input_schema(Ip, label_key="address"),
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
                extract_input_schema(Leak, label_key="name", icon = "breach"),
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
                extract_input_schema(CryptoWallet, label_key="address", icon = "cryptowallet"),
                extract_input_schema(CryptoWalletTransaction, label_key="hash", icon = "cryptowallet"),
                extract_input_schema(CryptoNFT, label_key="name", icon = "cryptowallet"),
            ],
        }
    ]

    return types



def extract_input_schema(model: Type[BaseModel], label_key:str, icon: Optional[str]=None) -> Dict[str, Any]:
    
    adapter = TypeAdapter(model)
    print(model.__name__)
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
                "fields": [resolve_field(prop, details=info, schema=schema)  
                for prop, info in details.get("properties", {}).items()
            ]
    }


def resolve_field(prop:str, details: dict, schema: dict = None) -> Dict:
    """_summary_
    The fields can sometimes contain nested complex objects, like: 
    - Organization having Individual[] as dirigeants, so we want to skip those.
    Args:
        details (dict): _description_
        schema_context (dict, optional): _description_. Defaults to None.

    Returns:
        str: _description_
    """
    field = { "name": prop,"label": details["title"], "description": details["description"], "type":"text"}
    if has_enum(details):
        field["type"] =  "select"
        field["options"]= [
        { "label": label, "value": label } for label in get_enum_values(details)
        ]
    field["required"] = is_required(details)
                    
    return field


def has_enum(schema: dict) -> bool:
    any_of = schema.get('anyOf', [])
    return any(isinstance(entry, dict) and 'enum' in entry for entry in any_of)

def is_required(schema: dict) -> bool:
    any_of = schema.get('anyOf', [])
    return not any(entry == {'type': 'null'} for entry in any_of)
   
def get_enum_values(schema: dict) -> list:
    enum_values = []
    for entry in schema.get('anyOf', []):
        if isinstance(entry, dict) and 'enum' in entry:
            enum_values.extend(entry['enum'])
    return enum_values