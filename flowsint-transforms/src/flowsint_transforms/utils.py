from urllib.parse import urlparse
import phonenumbers
import ipaddress
from phonenumbers import NumberParseException
from pydantic import TypeAdapter, BaseModel
from urllib.parse import urlparse
import re
import ssl
import socket
from typing import Dict, Any, List, Type
from pydantic import BaseModel
import inspect
from typing import Any, Dict, Type
from pydantic import BaseModel, TypeAdapter


def is_valid_ip(address: str) -> bool:
    try:
        ipaddress.ip_address(address)
        return True
    except ValueError:
        return False


def is_valid_username(username: str) -> bool:
    if not re.match(r"^[a-zA-Z0-9_-]{3,30}$", username):
        return False
    return True


def is_valid_email(email: str) -> bool:
    if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
        return False
    return True


def is_valid_domain(url_or_domain: str) -> str:

    try:
        parsed = urlparse(
            url_or_domain if "://" in url_or_domain else "http://" + url_or_domain
        )
        hostname = parsed.hostname or url_or_domain

        if not hostname or "." not in hostname:
            return False

        if not re.match(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", hostname):
            return False

        return True
    except Exception as e:
        return False


def is_root_domain(domain: str) -> bool:
    """
    Determine if a domain is a root domain or subdomain.

    Args:
        domain: The domain string to check

    Returns:
        True if it's a root domain (e.g., example.com), False if it's a subdomain (e.g., sub.example.com)
    """
    try:
        # Remove protocol if present
        if "://" in domain:
            parsed = urlparse(domain)
            domain = parsed.hostname or domain

        # Split by dots
        parts = domain.split(".")

        # Handle common country code TLDs that have 2 parts (e.g., .co.uk, .com.au, .org.uk)
        common_cc_tlds = [
            ".co.uk",
            ".com.au",
            ".org.uk",
            ".net.uk",
            ".gov.uk",
            ".ac.uk",
            ".co.nz",
            ".com.sg",
            ".co.jp",
            ".co.kr",
            ".com.br",
            ".com.mx",
        ]

        # Check if the domain ends with a common country code TLD
        for cc_tld in common_cc_tlds:
            if domain.endswith(cc_tld):
                # For country code TLDs, we need exactly 3 parts (e.g., example.co.uk)
                return len(parts) == 3

        # For regular TLDs, a root domain has 2 parts (e.g., example.com)
        # A subdomain has 3 or more parts (e.g., sub.example.com, www.sub.example.com)
        return len(parts) == 2
    except Exception:
        # If we can't parse it, assume it's not a root domain
        return False


def get_root_domain(domain: str) -> str:
    """
    Extract the root domain from a given domain string.

    Args:
        domain: The domain string (can be a subdomain or root domain)

    Returns:
        The root domain (e.g., "example.com" from "sub.example.com" or "www.sub.example.com")
    """
    try:
        # Remove protocol if present
        if "://" in domain:
            parsed = urlparse(domain)
            domain = parsed.hostname or domain

        # Split by dots
        parts = domain.split(".")

        # Handle common country code TLDs that have 2 parts (e.g., .co.uk, .com.au, .org.uk)
        common_cc_tlds = [
            ".co.uk",
            ".com.au",
            ".org.uk",
            ".net.uk",
            ".gov.uk",
            ".ac.uk",
            ".co.nz",
            ".com.sg",
            ".co.jp",
            ".co.kr",
            ".com.br",
            ".com.mx",
        ]

        # Check if the domain ends with a common country code TLD
        for cc_tld in common_cc_tlds:
            if domain.endswith(cc_tld):
                # For country code TLDs, take the last 3 parts (e.g., example.co.uk)
                if len(parts) >= 3:
                    return ".".join(parts[-3:])
                return domain

        # For regular TLDs, take the last 2 parts (e.g., example.com)
        if len(parts) >= 2:
            return ".".join(parts[-2:])
        
        return domain
    except Exception:
        # If we can't parse it, return the original domain
        return domain


def is_valid_number(phone: str, region: str = "FR") -> None:
    """
    Validates a phone number. Raises InvalidPhoneNumberError if invalid.
    - `region` should be ISO 3166-1 alpha-2 country code (e.g., 'FR' for France)
    """
    try:
        parsed = phonenumbers.parse(phone, region)
        if not phonenumbers.is_valid_number(parsed):
            return False
    except NumberParseException:
        return False


def parse_asn(asn: str) -> int:
    if not is_valid_asn(asn):
        raise ValueError(f"Invalid ASN format: {asn}")
    return int(re.sub(r"(?i)^AS", "", asn))


def is_valid_asn(asn: str) -> bool:
    if not re.fullmatch(r"(AS)?\d+", asn, re.IGNORECASE):
        return False
    asn_num = int(re.sub(r"(?i)^AS", "", asn))
    return 0 <= asn_num <= 4294967295


def resolve_type(details: dict, schema_context: dict = None) -> str:
    if "anyOf" in details:
        types = []
        for option in details["anyOf"]:
            if "$ref" in option:
                ref = option["$ref"].split("/")[-1]
                types.append(ref)
            elif option.get("type") == "array":
                # Handle array types within anyOf
                item_type = resolve_type(option.get("items", {}), schema_context)
                types.append(f"{item_type}[]")
            else:
                types.append(option.get("type", "unknown"))
        return " | ".join(types)

    if "type" in details:
        if details["type"] == "array":
            item_type = resolve_type(details.get("items", {}), schema_context)
            return f"{item_type}[]"
        return details["type"]

    # Handle $ref in array items or other contexts
    if "$ref" in details and schema_context:
        ref_path = details["$ref"]
        if ref_path.startswith("#/$defs/"):
            ref_name = ref_path.split("/")[-1]
            return ref_name

    return "any"


def extract_input_schema_flow(model: Type[BaseModel]) -> Dict[str, Any]:
    adapter = TypeAdapter(model)
    schema = adapter.json_schema()

    # Use the main schema properties, not the $defs
    type_name = model.__name__
    details = schema

    return {
        "class_name": model.__name__,
        "name": model.__name__,
        "module": model.__module__,
        "description": inspect.cleandoc(model.__doc__ or ""),
        "outputs": {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in details.get("properties", {}).items()
            ],
        },
        "inputs": {"type": "", "properties": []},
        "type": "type",
        "category": model.__name__,
    }


def get_domain_from_ssl(ip: str, port: int = 443) -> str | None:
    try:
        context = ssl.create_default_context()
        with socket.create_connection((ip, port), timeout=3) as sock:
            with context.wrap_socket(sock, server_hostname=ip) as ssock:
                cert = ssock.getpeercert()
                subject = cert.get("subject", [])
                for entry in subject:
                    if entry[0][0] == "commonName":
                        return entry[0][1]
                # Alternative: check subjectAltName
                san = cert.get("subjectAltName", [])
                for typ, val in san:
                    if typ == "DNS":
                        return val
    except Exception as e:
        print(f"SSL extraction failed for {ip}: {e}")
    return None


def extract_transform(transform: Dict[str, Any]) -> Dict[str, Any]:
    nodes = transform["nodes"]
    edges = transform["edges"]

    input_node = next((node for node in nodes if node["data"]["type"] == "type"), None)
    if not input_node:
        raise ValueError("No input node found.")
    input_output = input_node["data"]["outputs"]
    node_lookup = {node["id"]: node for node in nodes}

    transforms = []
    for edge in edges:
        target_id = edge["target"]
        source_handle = edge["sourceHandle"]
        target_handle = edge["targetHandle"]

        transform_node = node_lookup.get(target_id)
        if transform_node and transform_node["data"]["type"] == "transform":
            transforms.append(
                {
                    "transform_name": transform_node["data"]["name"],
                    "module": transform_node["data"]["module"],
                    "input": source_handle,
                    "output": target_handle,
                }
            )

    return {
        "input": {
            "name": input_node["data"]["name"],
            "outputs": input_output,
        },
        "transforms": transforms,
        "transform_names": [transform["transform_name"] for transform in transforms],
    }


def get_label_color(label: str) -> str:
    color_map = {"subdomain": "#A5ABB6", "domain": "#68BDF6", "default": "#A5ABB6"}

    return color_map.get(label, color_map["default"])


def flatten(data_dict, prefix=""):
    """
    Flattens a dictionary to contain only Neo4j-compatible property values.
    Neo4j supports primitive types (string, number, boolean) and arrays of those types.
    Args:
        data_dict (dict): Dictionary to flatten
    Returns:
        dict: Flattened dictionary with only Neo4j-compatible values
    """
    flattened = {}
    if not isinstance(data_dict, dict):
        return flattened
    for key, value in data_dict.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)) or (
            isinstance(value, list)
            and all(isinstance(item, (str, int, float, bool)) for item in value)
        ):
            key = f"{prefix}{key}"
            flattened[key] = value
    return flattened


def get_inline_relationships(nodes: List[Any], edges: List[Any]) -> List[str]:
    """
    Get the inline relationships for a list of nodes and edges.
    """
    relationships = []
    for edge in edges:
        source = next((node for node in nodes if node["id"] == edge["source"]), None)
        target = next((node for node in nodes if node["id"] == edge["target"]), None)
        if source and target:
            relationships.append({"source": source, "edge": edge, "target": target})
    return relationships


def to_json_serializable(obj):
    """Convert any object to a JSON-serializable format."""
    import json
    from pydantic import BaseModel

    try:
        # Test if already JSON serializable
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        # Handle common cases
        if isinstance(obj, BaseModel):
            # Use mode='json' to ensure all Pydantic types are properly serialized
            return (
                obj.model_dump(mode="json")
                if hasattr(obj, "model_dump")
                else obj.dict()
            )
        elif isinstance(obj, (list, tuple)):
            return [to_json_serializable(item) for item in obj]
        elif isinstance(obj, dict):
            return {key: to_json_serializable(value) for key, value in obj.items()}
        else:
            # Convert anything else to string
            return str(obj)
