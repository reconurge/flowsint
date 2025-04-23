from enum import Enum
from typing import List, Dict


class OSINTType(str, Enum):
    EMAIL = "email"
    USERNAME = "username"
    PHONE_NUMBER = "phone_number"
    URL = "url"
    DOMAIN = "domain"
    IP_ADDRESS = "ip_address"
    FULL_NAME = "full_name"
    TEXT = "text"
    ARRAY = "array"
    SOCIAL_PROFILE = "social_profile"
    LEAK_INFO = "leak_info"


OSINT_TYPE_METADATA = {
    OSINTType.EMAIL: {
        "label": "Email address",
        "regex": r"^[^@]+@[^@]+\.[^@]+$",
        "description": "A standard email address like user@example.com"
    },
    OSINTType.USERNAME: {
        "label": "Username",
        "regex": r"^[a-zA-Z0-9_.-]+$",
        "description": "A generic username used on platforms and forums"
    },
    OSINTType.PHONE_NUMBER: {
        "label": "Phone number",
        "regex": r"^\+?[0-9]{7,15}$",
        "description": "A phone number with optional international prefix"
    },
    OSINTType.URL: {
        "label": "Website URL",
        "regex": r"^https?://.+",
        "description": "A fully qualified website URL starting with http(s)"
    },
    OSINTType.DOMAIN: {
        "label": "Domain",
        "regex": r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        "description": "A domain like example.com"
    },
    OSINTType.IP_ADDRESS: {
        "label": "IP address",
        "regex": r"^\d{1,3}(\.\d{1,3}){3}$",
        "description": "An IPv4 address"
    },
    OSINTType.FULL_NAME: {
        "label": "Full name",
        "regex": r"^[\p{L} .'-]{2,}$",
        "description": "A person's full name"
    },
    OSINTType.TEXT: {
        "label": "Text",
        "regex": r"^.*$",
        "description": "Any free text input"
    },
    OSINTType.ARRAY: {
        "label": "Array",
        "regex": r"^\[.*\]$",
        "description": "A JSON array of values"
    },
    OSINTType.SOCIAL_PROFILE: {
        "label": "Social profile",
        "regex": r"^https?://(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:/[^\s]*)?$",
        "description": "A URL pointing to a social media profile"
    },
    OSINTType.LEAK_INFO: {
        "label": "Leak info",
        "regex": r"^.*$",
        "description": "Information extracted from data breaches"
    }
}


class OSINTTypeUtils:
    @staticmethod
    def get_osint_type_nodes() -> List[Dict[str, str]]:
        return [
            {
                "id": f"type::{t.value}",
                "class_name": meta["label"],
                "description": meta["description"],
                "regex": meta["regex"],
                "name": t.value,
            }
            for t, meta in OSINT_TYPE_METADATA.items()
        ]
