"""
Service for AI-assisted enricher template generation.

Uses an LLM to generate valid enricher template YAML from a free-text prompt.
"""

import os
import re
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
"""


def _extract_yaml(text: str) -> str:
    """Extract YAML content from LLM response, stripping markdown fences if present."""
    # Try to extract from markdown code fences
    match = re.search(r"```(?:ya?ml)?\s*\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


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

    async def generate(self, prompt: str, owner_id: UUID) -> str:
        """Generate an enricher template YAML from a free-text description.

        Args:
            prompt: User's free-text description of the desired enricher.
            owner_id: ID of the user (for vault-based LLM API key).

        Returns:
            Raw YAML string of the generated template.

        Raises:
            ValidationError: If the LLM output is not valid YAML or doesn't
                match the Template schema.
        """
        provider = self._get_llm_provider(owner_id)

        messages = [
            ChatMessage(role=MessageRole.SYSTEM, content=_SYSTEM_PROMPT),
            ChatMessage(role=MessageRole.USER, content=prompt),
        ]

        response = await provider.complete(messages)
        yaml_str = _extract_yaml(response)

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
