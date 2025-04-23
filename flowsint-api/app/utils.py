from urllib.parse import urlparse
from enum import Enum
import phonenumbers
from phonenumbers import NumberParseException

from urllib.parse import urlparse
import re

def is_valid_username(username: str) -> bool:
    if not re.match(r"^[a-zA-Z0-9_-]{3,30}$", username):
        raise ValueError(
            f"Invalid username '{username}': must be 3–30 characters, no spaces, only letters, numbers, - or _."
        )
    return username

def is_valid_url(url_or_domain: str) -> str:
    """
    Extracts the hostname from a URL or domain-like input.
    Raises a ValueError if the domain is clearly invalid.
    """
    parsed = urlparse(url_or_domain if "://" in url_or_domain else "http://" + url_or_domain)
    hostname = parsed.hostname or url_or_domain
    if not hostname or "." not in hostname:
        raise ValueError(f"Invalid domain: {url_or_domain}")
    if not re.match(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", hostname):
        raise ValueError(f"Malformed domain: {hostname}")
    return hostname

def is_valid_phone_number(phone: str, region: str = "FR") -> None:
    """
    Validates a phone number. Raises InvalidPhoneNumberError if invalid.
    - `region` should be ISO 3166-1 alpha-2 country code (e.g., 'FR' for France)
    """
    try:
        parsed = phonenumbers.parse(phone, region)
        if not phonenumbers.is_valid_number(parsed):
            raise ValueError(f"Invalid phone number: {phone}")
    except NumberParseException:
        raise ValueError(f"Invalid phone number: {phone}")

class DataType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
