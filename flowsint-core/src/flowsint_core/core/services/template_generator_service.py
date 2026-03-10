"""
Service for AI-assisted enricher template generation.

Uses an LLM to generate valid enricher template YAML from a free-text prompt.
"""

import json
import os
import re
from typing import Any, Dict, Optional
from uuid import UUID

import yaml
from sqlalchemy.orm import Session

from ..llm import ChatMessage, MessageRole, create_llm_provider
from .base import BaseService
from .exceptions import ValidationError
from .vault_service import VaultService
from flowsint_core.templates.types import Template


_SYSTEM_PROMPT = """\
You are a YAML template generator for Flowsint enrichers. Given a user's description, \
generate a valid enricher template in YAML format.

## Template Schema

A template has the following fields:

### Required fields:
- `name` (str): Unique name for the template (lowercase, hyphenated, e.g. "ip-api-lookup")
- `category` (str): Category matching the input type (e.g. "Ip", "Domain", "Username", "Email")
- `version` (float): Template version, start at 1.0
- `input`: Input configuration
  - `type` (str, required): The Flowsint type this template accepts (e.g. "Ip", "Domain", "Username", "Email")
  - `key` (str, default "nodeLabel"): The attribute to extract from the input for use in the template URL/body
- `request`: HTTP request configuration
  - `method` (str): "GET" or "POST"
  - `url` (str): URL with {{variable}} placeholders (e.g. "http://api.example.com/lookup/{{address}}")
  - `headers` (dict, optional): HTTP headers, values can use {{variable}} or {{secrets.SECRET_NAME}} placeholders
  - `params` (dict, optional): Query parameters
  - `body` (str, optional): Request body for POST requests
  - `timeout` (float, default 30): Request timeout in seconds (1-300)
- `response`: Response parsing configuration
  - `expect` (str): Expected format - "json", "xml", or "text"
  - `map` (dict): Mapping from output type field names to response paths (supports dot notation for nested fields)
- `output`: Output configuration
  - `type` (str, required): The Flowsint type to return (e.g. "Ip", "Domain", "SocialAccount")
  - `is_array` (bool, default false): Whether the response produces multiple outputs
  - `array_path` (str, optional): Dot-notation path to the array in response (e.g. "data.results")

### Optional fields:
- `description` (str): Human-readable description of what the template does
- `secrets`: List of secrets the template requires (fetched from user's vault)
  - `name` (str): Secret name, used as {{secrets.NAME}} in the template
  - `required` (bool, default true): Whether the secret is required
  - `description` (str, optional): What the secret is used for
- `retry`: Retry configuration for failed requests
  - `max_retries` (int, default 3, 0-10)
  - `backoff_factor` (float, default 0.5, 0.1-10.0)
  - `retry_on_status` (list[int], default [429, 500, 502, 503, 504])

## Variable Placeholders

- `{{key}}` — replaced with the input value (where `key` is `input.key`, e.g. `{{address}}` for IP)
- `{{secrets.SECRET_NAME}}` — replaced with the secret value from the user's vault

## Examples

### Example 1: Simple GET lookup (no auth)
```yaml
name: ip-api-lookup
category: Ip
version: 1.0
input:
  type: Ip
  key: address
request:
  method: GET
  url: http://ip-api.com/json/{{address}}
  params:
    fields: query,status,country,city,lat,lon,isp
  timeout: 30
response:
  expect: json
  map:
    address: query
    latitude: lat
    longitude: lon
    country: country
    city: city
    isp: isp
output:
  type: Ip
```

### Example 2: With API key authentication
```yaml
name: api-with-secrets
category: Ip
version: 1.0
input:
  type: Ip
  key: address
secrets:
  - name: API_KEY
    required: true
    description: API key for the service
request:
  method: GET
  url: https://api.example.com/lookup/{{address}}
  headers:
    Authorization: "Bearer {{secrets.API_KEY}}"
  timeout: 30
output:
  type: Ip
response:
  expect: json
  map:
    address: ip
    country: country
```

## Instructions

- Output ONLY the YAML template. No explanations, no markdown fences, no extra text.
- Infer the appropriate category, input type, and output type from the user's description.
- Use realistic field mappings based on common API response structures.
- If the API likely requires authentication, include a `secrets` section.
- Keep the template simple and focused on what the user asked for.
- IMPORTANT: Always quote values that contain {{...}} placeholders, e.g. `x-apikey: "{{secrets.API_KEY}}"`. Unquoted curly braces are invalid YAML.
"""


def _extract_yaml(text: str) -> str:
    """Extract YAML content from LLM response, stripping markdown fences if present."""
    # Try to extract from markdown code fences
    match = re.search(r"```(?:ya?ml)?\s*\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


def _quote_template_placeholders(yaml_str: str) -> str:
    """Quote unquoted {{...}} placeholders that would break YAML parsing."""
    return re.sub(
        r"(:\s+)(\{\{[^}]+\}\})\s*$",
        r'\1"\2"',
        yaml_str,
        flags=re.MULTILINE,
    )


class TemplateGeneratorService(BaseService):
    """Generates enricher template YAML from a free-text prompt using an LLM."""

    def __init__(self, db: Session, vault_service: VaultService):
        super().__init__(db=db)
        self._vault_service = vault_service

    def _get_llm_provider(self, owner_id: UUID):
        provider_name = os.environ.get("LLM_PROVIDER", "mistral")
        vault_key = f"{provider_name.upper()}_API_KEY"
        api_key = self._vault_service.get_secret(owner_id, vault_key)
        return create_llm_provider(provider=provider_name, api_key=api_key)

    def _build_type_context(
        self,
        input_type: Optional[str],
        input_schema: Optional[Dict[str, Any]],
        output_type: Optional[str],
        output_schema: Optional[Dict[str, Any]],
    ) -> str:
        """Build additional context about input/output type schemas."""
        parts: list[str] = []
        if input_type and input_schema:
            parts.append(
                f"## Input type: {input_type}\n"
                f"The template MUST use `input.type: {input_type}`.\n"
                f"Schema (available fields on the input):\n"
                f"```json\n{json.dumps(input_schema, indent=2)}\n```"
            )
        if output_type and output_schema:
            parts.append(
                f"## Output type: {output_type}\n"
                f"The template MUST use `output.type: {output_type}`.\n"
                f"The `response.map` keys MUST only use fields from this schema:\n"
                f"```json\n{json.dumps(output_schema, indent=2)}\n```"
            )
        return "\n\n".join(parts)

    async def generate(
        self,
        prompt: str,
        owner_id: UUID,
        input_type: Optional[str] = None,
        input_schema: Optional[Dict[str, Any]] = None,
        output_type: Optional[str] = None,
        output_schema: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Generate an enricher template YAML from a free-text description.

        Args:
            prompt: User's free-text description of the desired enricher.
            owner_id: ID of the user (for vault-based LLM API key).
            input_type: Name of the input Flowsint type (e.g. "Ip").
            input_schema: JSON schema of the input type.
            output_type: Name of the output Flowsint type (e.g. "SocialAccount").
            output_schema: JSON schema of the output type.

        Returns:
            Raw YAML string of the generated template.

        Raises:
            ValidationError: If the LLM output is not valid YAML or doesn't
                match the Template schema.
        """
        provider = self._get_llm_provider(owner_id)

        system_content = _SYSTEM_PROMPT
        type_context = self._build_type_context(
            input_type, input_schema, output_type, output_schema
        )
        if type_context:
            system_content += (
                "\n\n## Type Constraints (from the user's selection)\n\n"
                + type_context
                + "\n\nYou MUST respect the input and output types above. "
                "Only use fields that exist in the provided schemas for the response.map keys."
            )

        messages = [
            ChatMessage(role=MessageRole.SYSTEM, content=system_content),
            ChatMessage(role=MessageRole.USER, content=prompt),
        ]

        response = await provider.complete(messages)
        yaml_str = _extract_yaml(response)
        yaml_str = _quote_template_placeholders(yaml_str)

        # Validate the YAML
        try:
            parsed = yaml.safe_load(yaml_str)
        except yaml.YAMLError as e:
            raise ValidationError(f"LLM produced invalid YAML: {e}")

        if not isinstance(parsed, dict):
            raise ValidationError("LLM produced non-object YAML output")

        try:
            Template(**parsed)
        except Exception as e:
            raise ValidationError(f"Generated template failed validation: {e}")

        return yaml_str


def create_template_generator_service(db: Session) -> TemplateGeneratorService:
    return TemplateGeneratorService(db=db, vault_service=VaultService(db=db))
