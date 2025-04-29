from urllib.parse import urlparse
import phonenumbers
import ipaddress
from phonenumbers import NumberParseException
from pydantic import TypeAdapter, BaseModel
from urllib.parse import urlparse
import re
import ssl
import socket
from typing import Dict, Any


def is_valid_ip(address: str) -> bool:
    try:
        ipaddress.ip_address(address)
        return True
    except ValueError:
        return False

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

    input_node = next((node for node in nodes if node["data"]["type"] == "input"), None)
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
    
    
def neo4j_to_cytoscape(results):
    elements = []
    nodes = {}
    
    for record in results:
        a = record["a"]
        b = record["b"]
        r = record["r"]

        a_id = a.get("id") or a.get("name")
        b_id = b.get("id") or b.get("name")

        if a_id and a_id not in nodes:
            nodes[a_id] = {
                "data": {
                    "id": a_id,
                    "label": a.get("name") or a.get("username") or a_id,
                    "type": a.get("type")  # <-- ajoute le type
                }
            }
        
        if b_id and b_id not in nodes:
            nodes[b_id] = {
                "data": {
                    "id": b_id,
                    "label": b.get("name") or b.get("username") or b_id,
                    "type": b.get("type")  # <-- ajoute le type
                }
            }

        if a_id and b_id:
            elements.append({
                "data": {
                    "source": a_id,
                    "target": b_id,
                    "label": r[1]
                }
            })

    return list(nodes.values()) + elements
