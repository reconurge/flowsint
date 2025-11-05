"""
Entity type detection utilities for import feature.
Provides basic pattern matching for common entity types.
"""

import re
from typing import Optional
import ipaddress


# Ordered registry of detectors. Order matters to avoid false positives
# (e.g., URL should be checked before Domain).
# Each entry is a tuple of (entity_type, predicate_function)
DETECTORS = [
    ("Email", lambda v: is_email(v)),
    ("IP", lambda v: is_ip_address(v)),
    ("Website", lambda v: is_website(v)),
    ("Domain", lambda v: is_domain(v)),
    ("Phone", lambda v: is_phone(v)),
    ("ASN", lambda v: is_asn(v)),
    ("Username", lambda v: is_username(v)),
]


def detect_entity_type(value: str) -> Optional[str]:
    """
    Detect entity type based on value pattern.
    Returns the detected entity type or None if no match.

    Args:
        value: The string value to analyze

    Returns:
        Entity type string (e.g., "Email", "Domain", "IP") or None
    """
    if not value or not isinstance(value, str):
        return None

    value = value.strip()

    # Iterate through ordered detectors to find the first match
    for entity_type, predicate in DETECTORS:
        try:
            if predicate(value):
                return entity_type
        except Exception:
            # If a predicate raises, skip it to avoid breaking detection
            # (predicates should generally be safe and return bool)
            continue

    return None


def is_email(value: str) -> bool:
    """Check if value matches email pattern."""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_pattern, value))


def is_domain(value: str) -> bool:
    """Check if value matches domain pattern."""
    # Basic domain pattern: contains dots and valid characters
    domain_pattern = r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
    return bool(re.match(domain_pattern, value))


def is_ip_address(value: str) -> bool:
    """Check if value is a valid IPv4 or IPv6 address."""
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def is_website(value: str) -> bool:
    """Check if value matches URL/website pattern."""
    url_pattern = r'^https?://'
    return bool(re.match(url_pattern, value, re.IGNORECASE))


def is_phone(value: str) -> bool:
    """Check if value matches phone number pattern."""
    # Remove common separators for checking
    cleaned = re.sub(r'[\s\-\(\)\.]', '', value)
    # Check if it's mostly digits and has reasonable length
    phone_pattern = r'^\+?[0-9]{7,15}$'
    return bool(re.match(phone_pattern, cleaned))


def is_asn(value: str) -> bool:
    """Check if value matches ASN pattern."""
    asn_pattern = r'^AS\d+$'
    return bool(re.match(asn_pattern, value, re.IGNORECASE))


def is_username(value: str) -> bool:
    """Check if value matches username pattern (social media style)."""
    # Matches @username format or simple alphanumeric with underscores
    username_pattern = r'^@?[a-zA-Z0-9_]{3,30}$'
    if re.match(username_pattern, value):
        # Additional check: starts with @ or is not purely numeric
        return value.startswith('@') or not value.lstrip('@').isdigit()
    return False


def get_default_label(entity_type: str, value: str) -> str:
    """
    Get default label for an entity based on its type and value.

    Args:
        entity_type: The detected or selected entity type
        value: The entity value

    Returns:
        Default label string
    """
    # For most types, the value itself is a good label
    type_defaults = {
        "Email": value,
        "Domain": value,
        "IP": value,
        "Website": value,
        "Phone": value,
        "ASN": value,
        "Username": value.lstrip('@'),  # Remove @ prefix for label
        "Organization": value,
        "Individual": value,
    }

    return type_defaults.get(entity_type, value)
