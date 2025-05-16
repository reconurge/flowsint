from urllib.parse import urlparse
import phonenumbers
import ipaddress
from phonenumbers import NumberParseException
from pydantic import TypeAdapter, BaseModel
from urllib.parse import urlparse
import re
import ssl
import socket
from typing import Dict, Any, Type

from typing import Any, Dict
from pydantic import BaseModel

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

def extract_input_schema(name: str, model: Type[BaseModel]) -> Dict[str, Any]:
    adapter = TypeAdapter(model)
    schema = adapter.json_schema()

    # Vérifie si le schéma utilise $defs (références internes)
    if "$defs" in schema:
        type_name, details = list(schema["$defs"].items())[0]
    else:
        type_name = name
        details = schema

    return {
        "class_name": name,
        "name": name,
        "module": model.__module__,
        "doc": model.__doc__ or "",
        "outputs": {
            "type": type_name,
            "properties": [
                {
                    "name": prop,
                    "type": resolve_type(info)
                }
                for prop, info in details.get("properties", {}).items()
            ]
        },
        "inputs": {
            "type": "",
            "properties": []
        },
        "type": "type"
    }



def get_domain_from_ssl(ip: str, port: int = 443) -> str | None:
    try:
        context = ssl.create_default_context()
        with socket.create_connection((ip, port), timeout=3) as sock:
            with context.wrap_socket(sock, server_hostname=ip) as ssock:
                cert = ssock.getpeercert()
                subject = cert.get('subject', [])
                for entry in subject:
                    if entry[0][0] == 'commonName':
                        return entry[0][1]
                # Alternative: check subjectAltName
                san = cert.get('subjectAltName', [])
                for typ, val in san:
                    if typ == 'DNS':
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

    scanners = []
    for edge in edges:
        target_id = edge["target"]
        source_handle = edge["sourceHandle"]
        target_handle = edge["targetHandle"]

        scanner_node = node_lookup.get(target_id)
        if scanner_node and scanner_node["data"]["type"] == "scanner":
            scanners.append({
                "scanner_name": scanner_node["data"]["name"],
                "module": scanner_node["data"]["module"],
                "input": source_handle,
                "output": target_handle
            })

    return {
        "input": {
            "name": input_node["data"]["name"],
            "outputs": input_output,
        },
        "scanners": scanners,
    "scanner_names" : [scanner["scanner_name"] for scanner in scanners]

    }
    
def get_label_color(label: str) -> str:
    color_map = {
        'subdomain': '#A5ABB6',
        'domain': '#68BDF6',
        'default': '#A5ABB6'
    }
    
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
            isinstance(value, list) and all(isinstance(item, (str, int, float, bool)) for item in value)
        ):
            key = f"{prefix}{key}"
            flattened[key] = value 
    return flattened
