from urllib.parse import urlparse
import phonenumbers
from phonenumbers import NumberParseException
from pydantic import TypeAdapter, BaseModel
from urllib.parse import urlparse
import re


def is_valid_username(username: str) -> bool:
    if not re.match(r"^[a-zA-Z0-9_-]{3,30}$", username):
        raise ValueError(
            f"Invalid username '{username}': must be 3–30 characters, no spaces, only letters, numbers, - or _."
        )
    return username

def is_valid_domain(url_or_domain: str) -> str:

    parsed = urlparse(url_or_domain if "://" in url_or_domain else "http://" + url_or_domain)
    hostname = parsed.hostname or url_or_domain
    
    if not hostname or "." not in hostname:
        return "invalid"
    
    if not re.match(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", hostname):
        return "invalid"
    
    return hostname

def is_valid_number(phone: str, region: str = "FR") -> None:
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
    
def resolve_type(details: dict) -> str:
    if "anyOf" in details:
        types = []
        for option in details["anyOf"]:
            if "$ref" in option:
                ref = option["$ref"].split("/")[-1]
                types.append(ref)
            else:
                types.append(option.get("type", "unknown"))
        return " | ".join(types)
    
    if "type" in details:
        if details["type"] == "array":
            item_type = resolve_type(details.get("items", {}))
            return f"{item_type}[]"
        return details["type"]
    
    return "any"

def extract_input_schema(name: str, model: BaseModel) -> dict:
    adapter = TypeAdapter(model)
    schema = adapter.json_schema()
    properties = schema.get("properties", {})

    return {
        "class_name": name,
        "name": name,
        "module": model.__module__,
        "doc": model.__doc__,
        "outputs": [
            {
                "name": prop,
                "type": resolve_type(val)
            }
            for prop, val in properties.items()
        ],
        "inputs": [],
        "type": "input"
    }
