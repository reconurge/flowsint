import ipaddress
import re
from typing import Any, Optional, Set
from urllib.parse import urlparse

import yaml

from flowsint_core.core.graph.serializer import TypeResolver
from flowsint_core.templates.types import Template

# Template variable pattern: {{variable_name}} or {{secrets.NAME}}
TEMPLATE_RE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}")

# Allowed HTTP methods
ALLOWED_METHODS = ["GET", "POST"]

# Blocked IP ranges for SSRF protection
BLOCKED_IP_RANGES = [
    ipaddress.ip_network("127.0.0.0/8"),  # Loopback
    ipaddress.ip_network("10.0.0.0/8"),  # Private Class A
    ipaddress.ip_network("172.16.0.0/12"),  # Private Class B
    ipaddress.ip_network("192.168.0.0/16"),  # Private Class C
    ipaddress.ip_network("169.254.0.0/16"),  # Link-local (AWS/GCP metadata)
    ipaddress.ip_network("0.0.0.0/8"),  # Current network
    ipaddress.ip_network("224.0.0.0/4"),  # Multicast
    ipaddress.ip_network("240.0.0.0/4"),  # Reserved
    ipaddress.ip_network("100.64.0.0/10"),  # Carrier-grade NAT
    ipaddress.ip_network("198.18.0.0/15"),  # Benchmark testing
    ipaddress.ip_network("::1/128"),  # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),  # IPv6 private
    ipaddress.ip_network("fe80::/10"),  # IPv6 link-local
]

# Blocked hostnames for SSRF protection
BLOCKED_HOSTNAMES: Set[str] = {
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal",
    "metadata.google",
    "169.254.169.254",  # AWS/GCP/Azure metadata endpoint
}


class SSRFError(Exception):
    """Raised when a URL is blocked due to SSRF protection."""

    pass


class TemplateRenderError(Exception):
    """Raised when template rendering fails."""

    pass


def is_ip_blocked(ip_str: str) -> bool:
    """Check if an IP address is in a blocked range."""
    try:
        ip = ipaddress.ip_address(ip_str)
        for blocked_range in BLOCKED_IP_RANGES:
            if ip in blocked_range:
                return True
        return False
    except ValueError:
        # Not a valid IP address
        return False


def validate_url_safe(url: str) -> None:
    """
    Validate that a URL is safe to request (SSRF protection).

    Raises:
        SSRFError: If the URL targets a blocked host/IP
    """
    parsed = urlparse(url)
    hostname = parsed.hostname

    if not hostname:
        raise SSRFError(f"Invalid URL: no hostname found in '{url}'")

    # Check blocked hostnames
    hostname_lower = hostname.lower()
    if hostname_lower in BLOCKED_HOSTNAMES:
        raise SSRFError(f"Blocked hostname: {hostname}")

    # Check if hostname is an IP address in blocked range
    if is_ip_blocked(hostname):
        raise SSRFError(f"Blocked IP address: {hostname}")

    # Block file:// and other dangerous schemes
    if parsed.scheme not in ("http", "https"):
        raise SSRFError(f"Blocked URL scheme: {parsed.scheme}")


def sanitize_url_component(value: str) -> str:
    """
    Sanitize a value before inserting into a URL.
    Prevents injection attacks via URL manipulation.
    """
    # Remove or encode dangerous characters that could alter URL structure
    # Allow alphanumeric, dash, underscore, dot, and common safe chars
    # Encode everything else
    from urllib.parse import quote

    return quote(str(value), safe="-_.~")


class YamlLoader:
    @staticmethod
    def load_enricher_yaml(filename: str) -> dict[str, Any] | yaml.YAMLError:
        with open(filename) as stream:
            try:
                return yaml.safe_load(stream)
            except yaml.YAMLError as exc:
                return exc

    @staticmethod
    def parse_yaml_to_template(
        raw: dict[str, Any],
        type_resolver: Optional[TypeResolver] = None,
    ) -> Template:
        if not isinstance(raw, dict):
            raise ValueError("Template must be a YAML dictionary")

        input_cfg: dict | None = raw.get("input", None)

        if not input_cfg or not isinstance(input_cfg, dict):
            raise ValueError("Missing 'input' property in the yaml.")

        input_type: str | None = input_cfg.get("type", None)

        if not input_type:
            raise ValueError("Missing 'input.type' property in the yaml.")

        if not type_resolver:
            from flowsint_core.core.services.type_registry_service import local_type_resolver
            type_resolver = local_type_resolver
        DetectedType = type_resolver(input_type)

        request = raw.get("request", {})
        method = request.get("method", "GET")

        if method not in ALLOWED_METHODS:
            raise ValueError(
                f"Method '{method}' not present in {', '.join(ALLOWED_METHODS)}"
            )

        if not DetectedType:
            raise ValueError(f"Type '{input_type}' not found in registry.")

        return Template(**raw)

    @staticmethod
    def get_template_from_file(
        filename: str,
        type_resolver: Optional[TypeResolver] = None,
    ) -> Template | None:
        template_dict = YamlLoader.load_enricher_yaml(filename)
        if not isinstance(template_dict, dict):
            return None

        return YamlLoader.parse_yaml_to_template(
            template_dict, type_resolver=type_resolver
        )

    @staticmethod
    def render_template(
        template: str,
        values: dict[str, str],
        sanitize: bool = True,
    ) -> str:
        """
        Render a template string by substituting {{variable}} placeholders.

        Args:
            template: Template string with {{variable}} placeholders
            values: Dictionary of variable names to their values
            sanitize: If True, sanitize values for URL safety (default True)

        Returns:
            Rendered string with all placeholders substituted

        Raises:
            TemplateRenderError: If a required variable is missing
        """

        def replace(match: re.Match) -> str:
            key = match.group(1)
            if key not in values:
                raise TemplateRenderError(f"Missing template variable: {key}")
            value = values[key]
            if sanitize:
                return sanitize_url_component(value)
            return str(value)

        return TEMPLATE_RE.sub(replace, template)

    @staticmethod
    def render_dict(
        data: dict,
        values: dict[str, str],
        sanitize: bool = True,
    ) -> dict:
        """
        Recursively render all string values in a dictionary.

        Args:
            data: Dictionary with potential {{variable}} placeholders in values
            values: Dictionary of variable names to their values
            sanitize: If True, sanitize values for URL safety

        Returns:
            New dictionary with all placeholders substituted
        """
        result = {}
        for key, value in data.items():
            if isinstance(value, str):
                result[key] = YamlLoader.render_template(value, values, sanitize)
            elif isinstance(value, dict):
                result[key] = YamlLoader.render_dict(value, values, sanitize)
            elif isinstance(value, list):
                result[key] = [
                    YamlLoader.render_template(item, values, sanitize)
                    if isinstance(item, str)
                    else item
                    for item in value
                ]
            else:
                result[key] = value
        return result

    @staticmethod
    def extract_nested_value(data: Any, path: str) -> Any:
        """
        Extract a value from nested data using dot notation.

        Args:
            data: The data structure to extract from
            path: Dot-notation path (e.g., 'data.user.name' or 'items.0.value')

        Returns:
            The value at the specified path, or None if not found
        """
        if not path:
            return data

        parts = path.split(".")
        current = data

        for part in parts:
            if current is None:
                return None

            # Handle array index access
            if isinstance(current, list):
                try:
                    index = int(part)
                    if 0 <= index < len(current):
                        current = current[index]
                    else:
                        return None
                except ValueError:
                    # Not an integer, can't index list
                    return None
            elif isinstance(current, dict):
                current = current.get(part)
            else:
                # Can't traverse further
                return None

        return current
