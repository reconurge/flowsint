"""
Flowsint Types - Pydantic models for flowsint
"""

from .address import Location
from .affiliation import Affiliation
from .alias import Alias
from .asn import ASN
from .bank_account import BankAccount
from .breach import Breach
from .cidr import CIDR
from .credential import Credential
from .credit_card import CreditCard
from .device import Device
from .dns_record import DNSRecord
from .document import Document
from .domain import Domain
from .email import Email
from .file import File
from .gravatar import Gravatar
from .individual import Individual
from .ip import Ip
from .leak import Leak
from .malware import Malware
from .message import Message
from .organization import Organization
from .phone import Phone
from .phrase import Phrase
from .port import Port
from .reputation_score import ReputationScore
from .risk_profile import RiskProfile
from .script import Script
from .session import Session
from .social_account import SocialAccount
from .ssl_certificate import SSLCertificate
from .username import Username
from .wallet import CryptoWallet, CryptoWalletTransaction, CryptoNFT
from .weapon import Weapon
from .web_tracker import WebTracker
from .website import Website
from .whois import Whois

from typing import Dict, Type, Any, Optional
from pydantic import BaseModel

__version__ = "0.1.0"
__author__ = "dextmorgn <contact@flowsint.io>"

__all__ = [
    "Location",
    "Affiliation",
    "Alias",
    "ASN",
    "BankAccount",
    "Breach",
    "CIDR",
    "Credential",
    "CreditCard",
    "Device",
    "DNSRecord",
    "Document",
    "Domain",
    "Email",
    "File",
    "Gravatar",
    "Individual",
    "Ip",
    "Leak",
    "Malware",
    "Message",
    "Organization",
    "Phone",
    "Phrase",
    "Port",
    "ReputationScore",
    "RiskProfile",
    "Script",
    "Session",
    "SocialAccount",
    "SSLCertificate",
    "Node",
    "Edge",
    "Username",
    "CryptoWallet",
    "CryptoWalletTransaction",
    "CryptoNFT",
    "Weapon",
    "WebTracker",
    "Website",
    "Whois",
    # Type registry utilities
    "TYPE_TO_MODEL",
    "get_model_for_type",
    "clean_neo4j_node_data",
    "parse_node_to_pydantic",
    "serialize_pydantic_for_transport",
    "deserialize_pydantic_from_transport",
]


# Type Registry: mapping Neo4j node types to Pydantic model classes
# Keys are lowercase to match Neo4j node type property
TYPE_TO_MODEL: Dict[str, Type[BaseModel]] = {
    "domain": Domain,
    "email": Email,
    "ip": Ip,
    "phone": Phone,
    "username": Username,
    "organization": Organization,
    "individual": Individual,
    "socialaccount": SocialAccount,
    "asn": ASN,
    "cidr": CIDR,
    "cryptowallet": CryptoWallet,
    "cryptowallettransaction": CryptoWalletTransaction,
    "cryptonft": CryptoNFT,
    "website": Website,
    "port": Port,
    "phrase": Phrase,
    "breach": Breach,
    "credential": Credential,
    "device": Device,
    "document": Document,
    "file": File,
    "malware": Malware,
    "sslcertificate": SSLCertificate,
    "location": Location,
    "affiliation": Affiliation,
    "alias": Alias,
    "bankaccount": BankAccount,
    "creditcard": CreditCard,
    "dnsrecord": DNSRecord,
    "gravatar": Gravatar,
    "leak": Leak,
    "message": Message,
    "reputationscore": ReputationScore,
    "riskprofile": RiskProfile,
    "script": Script,
    "session": Session,
    "webtracker": WebTracker,
    "weapon": Weapon,
    "whois": Whois,
}


def get_model_for_type(type_name: str) -> Optional[Type[BaseModel]]:
    """
    Get the Pydantic model class for a given type name.

    Args:
        type_name: The type name as stored in Neo4j (case-insensitive)

    Returns:
        The corresponding Pydantic model class, or None if not found
    """
    return TYPE_TO_MODEL.get(type_name.lower())


def clean_neo4j_node_data(node_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean Neo4j node data by removing Neo4j-specific fields and empty values.

    This is a preprocessing step that should be applied before Pydantic validation.

    Args:
        node_data: Dictionary containing node properties from Neo4j

    Returns:
        Cleaned dictionary with Neo4j fields and empty values removed

    Example:
        >>> node_data = {
        ...     'type': 'ip',
        ...     'address': '192.168.1.1',
        ...     'latitude': '',
        ...     'sketch_id': 'abc-123',
        ...     'x': 100,
        ... }
        >>> clean_neo4j_node_data(node_data)
        {'address': '192.168.1.1', 'label': 'sample'}
    """
    cleaned = {}
    for k, v in node_data.items():
        # Skip Neo4j-specific fields (including 'type' which is the node type in Neo4j)
        if k in ['sketch_id', 'created_at', 'type', 'x', 'y', 'caption', 'color']:
            continue

        # Skip empty values (empty strings, None, empty lists, etc.)
        if v in ('', None, [], {}):
            continue

        cleaned[k] = v

    return cleaned


def parse_node_to_pydantic(node_data: Dict[str, Any]) -> Optional[BaseModel]:
    """
    Parse a Neo4j node's properties into a Pydantic model instance.

    Args:
        node_data: Dictionary containing node properties from Neo4j.
                   Must include a 'type' field indicating the node type.

    Returns:
        An instance of the appropriate Pydantic model, or None if parsing fails

    Example:
        >>> node_data = {
        ...     'type': 'domain',
        ...     'domain': 'example.com',
        ...     'label': 'example.com'
        ... }
        >>> result = parse_node_to_pydantic(node_data)
        >>> isinstance(result, Domain)
        True
    """
    if not node_data or 'type' not in node_data:
        return None

    node_type = node_data.get('type')
    model_class = get_model_for_type(node_type)

    if not model_class:
        return None

    try:
        # Clean the node data first
        cleaned_data = clean_neo4j_node_data(node_data)

        # Try to instantiate the Pydantic model
        return model_class(**cleaned_data)
    except Exception as e:
        # If validation fails, log the error for debugging
        print(f"[ERROR] Failed to parse {node_type} node: {e}")
        return None


def serialize_pydantic_for_transport(obj: BaseModel) -> Dict[str, Any]:
    """
    Serialize a Pydantic object for transport (e.g., to Celery tasks).

    Args:
        obj: Pydantic model instance

    Returns:
        Dictionary representation suitable for JSON serialization
    """
    return obj.model_dump(mode='json')


def deserialize_pydantic_from_transport(data: Dict[str, Any], type_name: str) -> Optional[BaseModel]:
    """
    Deserialize a dictionary back into a Pydantic model instance.

    Args:
        data: Dictionary representation of the object
        type_name: The type name (e.g., 'domain', 'ip')

    Returns:
        Pydantic model instance, or None if deserialization fails
    """
    model_class = get_model_for_type(type_name)

    if not model_class:
        return None

    try:
        return model_class(**data)
    except Exception:
        return None
