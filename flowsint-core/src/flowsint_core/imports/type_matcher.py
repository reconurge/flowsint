"""
Entity type matching based on flowsint_types.
Determines which entity type best matches the row data.
"""

from typing import Optional, Dict, Any, List
import re
import ipaddress

# Import all entity types from flowsint_types
try:
    from flowsint_types import (
        Email, Domain, Ip, ASN, Phone, Username, Website,
        Organization, Individual, SocialProfile, Device,
        Credential, Malware, SSLCertificate, Document, File
    )
    FLOWSINT_TYPES_AVAILABLE = True
except ImportError:
    FLOWSINT_TYPES_AVAILABLE = False


# Registry of entity type matchers
# Each entry: (type_name, class_name, identifier_fields, matcher_function)
TYPE_REGISTRY: List[tuple] = [
    ("Email", "Email", ["email", "mail", "e-mail", "address"], lambda d: _match_email(d)),
    ("Ip", "Ip", ["ip", "ip_address", "ipv4", "ipv6", "address"], lambda d: _match_ip(d)),
    ("Domain", "Domain", ["domain", "hostname", "host"], lambda d: _match_domain(d)),
    ("Website", "Website", ["url", "website", "web", "link"], lambda d: _match_website(d)),
    ("Phone", "Phone", ["phone", "telephone", "tel", "mobile", "cell"], lambda d: _match_phone(d)),
    ("ASN", "ASN", ["asn", "as_number"], lambda d: _match_asn(d)),
    ("Username", "Username", ["username", "user", "handle", "login"], lambda d: _match_username(d)),
    ("Organization", "Organization", ["organization", "org", "company", "name"], lambda d: _match_organization(d)),
    ("Individual", "Individual", ["name", "person", "individual", "fullname"], lambda d: _match_individual(d)),
    ("SocialProfile", "SocialProfile", ["social", "profile", "account"], lambda d: _match_social(d)),
    ("Credential", "Credential", ["credential", "password", "creds"], lambda d: _match_credential(d)),
]


def detect_entity_type_from_row(row_data: Dict[str, Any]) -> Optional[str]:
    """
    Detect the most likely entity type for a row of data.

    Args:
        row_data: Dictionary of column_name: value pairs

    Returns:
        Entity type name (e.g., "Email", "Domain", "Ip") or None
    """
    if not row_data:
        return None

    # Normalize keys to lowercase for comparison, skip None keys
    normalized_data = {
        k.lower().strip(): v
        for k, v in row_data.items()
        if v and k is not None
    }

    # Try to match each type
    scores = {}
    for type_name, class_name, identifier_fields, matcher_func in TYPE_REGISTRY:
        score = 0

        # Check if any identifier field matches
        for field in identifier_fields:
            if field in normalized_data:
                score += 10

        # Use matcher function to validate
        try:
            if matcher_func(normalized_data):
                score += 5
        except Exception:
            pass

        if score > 0:
            scores[type_name] = score

    # Return type with highest score
    if scores:
        return max(scores, key=scores.get)

    return None


def get_primary_identifier(row_data: Dict[str, Any], entity_type: str) -> Optional[str]:
    """
    Get the primary identifier value for an entity based on its type.

    Args:
        row_data: Dictionary of column_name: value pairs
        entity_type: The detected entity type

    Returns:
        The primary identifier value (e.g., email address, domain name, IP)
    """
    normalized_data = {k.lower().strip(): v for k, v in row_data.items() if v}

    # Find the registry entry for this type
    for type_name, class_name, identifier_fields, _ in TYPE_REGISTRY:
        if type_name == entity_type:
            # Look for identifier fields in order of priority
            for field in identifier_fields:
                if field in normalized_data:
                    return str(normalized_data[field]).strip()

    # Fallback: try common value fields
    for key in ["value", "name", "identifier", "id"]:
        if key in normalized_data:
            return str(normalized_data[key]).strip()

    # Last resort: return first non-empty value
    for value in row_data.values():
        if value and str(value).strip():
            return str(value).strip()

    return None


# Matcher functions for each entity type

def _match_email(data: Dict[str, Any]) -> bool:
    """Check if data looks like an email entity."""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    for key, value in data.items():
        if any(k in key for k in ["email", "mail"]):
            return bool(re.match(email_pattern, str(value)))

    # Check if any value looks like an email
    for value in data.values():
        if re.match(email_pattern, str(value)):
            return True

    return False


def _match_ip(data: Dict[str, Any]) -> bool:
    """Check if data looks like an IP entity."""
    for key, value in data.items():
        if any(k in key for k in ["ip", "address"]) and "email" not in key:
            try:
                ipaddress.ip_address(str(value))
                return True
            except ValueError:
                pass

    # Check if any value looks like an IP
    for value in data.values():
        try:
            ipaddress.ip_address(str(value))
            return True
        except (ValueError, AttributeError):
            pass

    return False


def _match_domain(data: Dict[str, Any]) -> bool:
    """Check if data looks like a domain entity."""
    domain_pattern = r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'

    for key, value in data.items():
        if any(k in key for k in ["domain", "hostname", "host"]):
            return bool(re.match(domain_pattern, str(value)))

    # Check if any value looks like a domain (but not email)
    for value in data.values():
        val_str = str(value)
        if re.match(domain_pattern, val_str) and "@" not in val_str and not val_str.startswith("http"):
            return True

    return False


def _match_website(data: Dict[str, Any]) -> bool:
    """Check if data looks like a website entity."""
    url_pattern = r'^https?://'

    for key, value in data.items():
        if any(k in key for k in ["url", "website", "web", "link"]):
            return bool(re.match(url_pattern, str(value), re.IGNORECASE))

    # Check if any value looks like a URL
    for value in data.values():
        if re.match(url_pattern, str(value), re.IGNORECASE):
            return True

    return False


def _match_phone(data: Dict[str, Any]) -> bool:
    """Check if data looks like a phone entity."""
    for key, value in data.items():
        if any(k in key for k in ["phone", "tel", "mobile", "cell"]):
            # Remove common separators
            cleaned = re.sub(r'[\s\-\(\)\.]', '', str(value))
            phone_pattern = r'^\+?[0-9]{7,15}$'
            return bool(re.match(phone_pattern, cleaned))

    return False


def _match_asn(data: Dict[str, Any]) -> bool:
    """Check if data looks like an ASN entity."""
    asn_pattern = r'^AS\d+$'

    for key, value in data.items():
        if "asn" in key or "as_number" in key or "as_name" in key:
            return bool(re.match(asn_pattern, str(value), re.IGNORECASE))

    # Check if any value looks like an ASN
    for value in data.values():
        if re.match(asn_pattern, str(value), re.IGNORECASE):
            return True

    return False


def _match_username(data: Dict[str, Any]) -> bool:
    """Check if data looks like a username entity."""
    username_pattern = r'^@?[a-zA-Z0-9_]{3,30}$'

    for key, value in data.items():
        if any(k in key for k in ["username", "user", "handle"]):
            val_str = str(value)
            if re.match(username_pattern, val_str):
                return val_str.startswith('@') or not val_str.isdigit()

    # Fallback: check if any value looks like a username
    # (but not if it looks like other types)
    for key, value in data.items():
        val_str = str(value)
        if re.match(username_pattern, val_str):
            # Make sure it's not an email or domain
            if '@' not in val_str and '.' not in val_str:
                # If it starts with @ or is not purely numeric, likely a username
                if val_str.startswith('@') or not val_str.isdigit():
                    return True

    return False


def _match_organization(data: Dict[str, Any]) -> bool:
    """Check if data looks like an organization entity."""
    # Look for organization-specific fields
    org_fields = ["organization", "org", "company", "siren", "siret", "company_name"]

    for key in data.keys():
        if any(field in key for field in org_fields):
            return True

    # If has "name" but no individual-specific fields
    if "name" in data:
        individual_fields = ["firstname", "lastname", "first_name", "last_name", "email"]
        has_individual_fields = any(field in data for field in individual_fields)
        return not has_individual_fields

    return False


def _match_individual(data: Dict[str, Any]) -> bool:
    """Check if data looks like an individual entity."""
    # Look for individual-specific fields
    individual_fields = ["firstname", "lastname", "first_name", "last_name", "fullname", "person"]

    for key in data.keys():
        if any(field in key for field in individual_fields):
            return True

    return False


def _match_social(data: Dict[str, Any]) -> bool:
    """Check if data looks like a social profile entity."""
    social_fields = ["twitter", "linkedin", "facebook", "instagram", "github", "social"]

    for key in data.keys():
        if any(field in key for field in social_fields):
            return True

    return False


def _match_credential(data: Dict[str, Any]) -> bool:
    """Check if data looks like a credential entity."""
    # Look for credential-specific fields
    if ("password" in data or "pass" in data) and ("username" in data or "user" in data or "email" in data):
        return True

    return False
