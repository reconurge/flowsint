"""
Template-based enricher that executes HTTP requests defined in YAML templates.

This enricher allows creating declarative enrichers without writing Python code.
Templates define:
- Input/output types from the FlowsintType registry
- HTTP request configuration (method, URL, headers, params, body)
- Response parsing and field mapping
- Optional vault secrets for API keys
- Retry configuration for resilience

Security features:
- SSRF protection blocks requests to internal IPs and cloud metadata endpoints
- Input values are URL-encoded to prevent injection attacks
- Vault integration keeps secrets out of templates

Example template:
    name: github-user-lookup
    category: Username
    version: 1.0
    input:
      type: Username
      key: username
    secrets:
      - name: GITHUB_TOKEN
        required: false
    request:
      method: GET
      url: https://api.github.com/users/{{username}}
      headers:
        Authorization: "Bearer {{secrets.GITHUB_TOKEN}}"
      timeout: 10
    response:
      expect: json
      map:
        username: login
        full_name: name
        avatar_url: avatar_url
    output:
      type: Username
    retry:
      max_retries: 3
      backoff_factor: 1.0
"""

import asyncio
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional

import httpx
from flowsint_types import FlowsintType, get_type

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_core.templates.loader.yaml_loader import (
    SSRFError,
    TemplateRenderError,
    YamlLoader,
    validate_url_safe,
)
from flowsint_core.templates.types import Template, TemplateRetryConfig


class TemplateEnricherError(Exception):
    """Base exception for template enricher errors."""

    pass


class TemplateEnricher(Enricher):
    """
    Enricher that executes HTTP requests based on YAML template definitions.

    Supports:
    - GET and POST HTTP methods
    - Template variables in URL, headers, params, and body
    - Vault integration for secrets ({{secrets.NAME}})
    - Nested response mapping with dot notation
    - Array response handling
    - Configurable retry with exponential backoff
    - JSON, XML, and text response parsing
    - SSRF protection
    """

    InputType = FlowsintType
    OutputType = FlowsintType

    def __init__(
        self,
        template: Template,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        # Build params schema from template secrets
        params_schema = self._build_params_schema_from_template(template)

        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            vault=vault,
            params=params,
            params_schema=params_schema,
        )
        self.template = template
        self.InputType = self._detect_type(self.template.input.type)
        self.OutputType = self._detect_type(self.template.output.type)
        self.request = self.template.request
        self._resolved_secrets: Dict[str, str] = {}

    @staticmethod
    def _build_params_schema_from_template(template: Template) -> List[Dict[str, Any]]:
        """Convert template secrets to enricher params schema format."""
        schema = []
        for secret in template.secrets:
            schema.append(
                {
                    "name": secret.name,
                    "type": "vaultSecret",
                    "required": secret.required,
                    "description": secret.description or f"Secret: {secret.name}",
                }
            )
        return schema

    def _detect_type(self, input_type: str) -> type[FlowsintType]:
        """Resolve a type name to its FlowsintType class."""
        DetectedType = get_type(input_type)
        if not DetectedType:
            raise TypeError(f"Type '{input_type}' is not present in registry.")
        return DetectedType

    def name(self) -> str:  # type: ignore[override]
        return self.template.name

    def category(self) -> str:  # type: ignore[override]
        return self.template.category

    def key(self) -> str:  # type: ignore[override]
        return self.template.input.key

    @classmethod
    def documentation(cls) -> str:
        """Return formatted markdown documentation for template enrichers."""
        return "Template-based enricher. See template definition for details."

    async def async_init(self):
        """Initialize the enricher, resolving vault secrets."""
        await super().async_init()
        # Store resolved secrets for template rendering
        for secret in self.template.secrets:
            value = self.get_secret(secret.name)
            if value is not None:
                self._resolved_secrets[f"secrets.{secret.name}"] = value
            elif secret.required:
                raise TemplateEnricherError(
                    f"Required secret '{secret.name}' not found in vault"
                )

    def _build_template_values(self, input_obj: Any) -> Dict[str, str]:
        """
        Build the values dict for template rendering from input object and secrets.

        Args:
            input_obj: The input FlowsintType object

        Returns:
            Dictionary of variable names to their string values
        """
        values: Dict[str, str] = {}

        # Add input key value
        key = self.template.input.key
        if hasattr(input_obj, key):
            values[key] = str(getattr(input_obj, key))

        # Add resolved secrets
        values.update(self._resolved_secrets)

        return values

    def _build_mapped_result(self, result: Any) -> Any:
        """
        Map response data to output type using the template's response.map config.

        Args:
            result: The parsed response data (dict for JSON, Element for XML, str for text)

        Returns:
            Instance of OutputType with mapped fields
        """
        mappings = self.template.response.map

        output_dict = {}
        for output_field, response_path in mappings.items():
            if self.template.response.expect == "xml" and isinstance(
                result, ET.Element
            ):
                # For XML, use XPath-like access
                value = self._extract_xml_value(result, response_path)
            else:
                # For JSON/dict, use dot notation
                value = YamlLoader.extract_nested_value(result, response_path)
            output_dict[output_field] = value

        return self.OutputType(**output_dict)

    def _extract_xml_value(self, element: ET.Element, path: str) -> Optional[str]:
        """
        Extract a value from an XML element using a simple path.

        Args:
            element: XML Element to search
            path: Dot-notation path (e.g., 'user.name' or just 'name')

        Returns:
            Text content of the found element, or None
        """
        parts = path.split(".")
        current = element

        for part in parts:
            found = current.find(part)
            if found is None:
                # Try with namespace wildcard
                found = current.find(f".//{part}")
            if found is None:
                return None
            current = found

        return current.text

    def _parse_response(self, response: httpx.Response) -> Any:
        """
        Parse the HTTP response based on expected format.

        Args:
            response: The httpx Response object

        Returns:
            Parsed data (dict for JSON, Element for XML, str for text)

        Raises:
            TemplateEnricherError: If parsing fails
        """
        expect = self.template.response.expect

        if expect == "json":
            try:
                return response.json()
            except Exception as e:
                raise TemplateEnricherError(f"Failed to parse JSON response: {e}")

        elif expect == "xml":
            try:
                return ET.fromstring(response.text)
            except ET.ParseError as e:
                raise TemplateEnricherError(f"Failed to parse XML response: {e}")

        elif expect == "text":
            return response.text

        else:
            raise TemplateEnricherError(f"Unknown response format: {expect}")

    def _get_retry_config(self) -> TemplateRetryConfig:
        """Get retry configuration, using defaults if not specified."""
        if self.template.retry:
            return self.template.retry
        return TemplateRetryConfig()

    async def _make_request_with_retry(
        self,
        client: httpx.AsyncClient,
        method: str,
        url: str,
        headers: Dict[str, str],
        params: Dict[str, Any],
        body: Optional[str],
        timeout: float,
    ) -> httpx.Response:
        """
        Make an HTTP request with retry logic.

        Args:
            client: The httpx AsyncClient
            method: HTTP method (GET, POST)
            url: Request URL
            headers: Request headers
            params: Query parameters
            body: Request body (for POST)
            timeout: Request timeout in seconds

        Returns:
            httpx Response object

        Raises:
            httpx.HTTPStatusError: If request fails after all retries
        """
        retry_config = self._get_retry_config()
        last_exception: Optional[Exception] = None

        for attempt in range(retry_config.max_retries + 1):
            try:
                if method == "POST":
                    response = await client.post(
                        url,
                        headers=headers,
                        params=params,
                        content=body,
                        timeout=timeout,
                    )
                else:
                    response = await client.get(
                        url,
                        headers=headers,
                        params=params,
                        timeout=timeout,
                    )

                # Check if we should retry based on status code
                if response.status_code in retry_config.retry_on_status:
                    if attempt < retry_config.max_retries:
                        wait_time = retry_config.backoff_factor * (2**attempt)
                        Logger.info(
                            self.sketch_id,
                            {
                                "message": f"Retrying request (attempt {attempt + 1}/{retry_config.max_retries}) "
                                f"after {response.status_code}, waiting {wait_time}s"
                            },
                        )
                        await asyncio.sleep(wait_time)
                        continue

                response.raise_for_status()
                return response

            except httpx.TimeoutException as e:
                last_exception = e
                if attempt < retry_config.max_retries:
                    wait_time = retry_config.backoff_factor * (2**attempt)
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"Request timeout, retrying (attempt {attempt + 1}/{retry_config.max_retries}), "
                            f"waiting {wait_time}s"
                        },
                    )
                    await asyncio.sleep(wait_time)
                    continue
                raise

            except httpx.HTTPStatusError as e:
                # Don't retry client errors (4xx) except rate limits
                if 400 <= e.response.status_code < 500:
                    if e.response.status_code not in retry_config.retry_on_status:
                        raise
                last_exception = e
                if attempt < retry_config.max_retries:
                    wait_time = retry_config.backoff_factor * (2**attempt)
                    await asyncio.sleep(wait_time)
                    continue
                raise

        # Should not reach here, but just in case
        if last_exception:
            raise last_exception
        raise TemplateEnricherError("Request failed after all retries")

    async def _process_single_input(
        self,
        client: httpx.AsyncClient,
        input_obj: Any,
    ) -> List[Any]:
        """
        Process a single input value through the template.

        Args:
            client: The httpx AsyncClient
            input_obj: The input FlowsintType object

        Returns:
            List of OutputType instances (can be multiple for array responses)
        """
        req = self.request
        key = self.template.input.key

        if not key:
            raise TemplateEnricherError(
                f"Key is missing for input type {self.template.input.type}."
            )

        # Build template values from input and secrets
        values = self._build_template_values(input_obj)

        # Render URL with template values
        url = YamlLoader.render_template(req.url, values)

        # Validate URL is safe (SSRF protection)
        try:
            validate_url_safe(url)
        except SSRFError as e:
            Logger.info(
                self.sketch_id,
                {"message": f"SSRF protection blocked request to {url}: {e}"},
            )
            raise TemplateEnricherError(f"Blocked URL: {e}")

        # Render headers
        headers = YamlLoader.render_dict(dict(req.headers), values, sanitize=False)

        # Render params
        params = YamlLoader.render_dict(dict(req.params), values)

        # Render body if present
        body = None
        if req.body:
            body = YamlLoader.render_template(req.body, values, sanitize=False)

        # Make the request with retry
        response = await self._make_request_with_retry(
            client=client,
            method=req.method,
            url=url,
            headers=headers,
            params=params,
            body=body,
            timeout=req.timeout,
        )

        # Parse response
        data = self._parse_response(response)

        # Handle array responses
        results = []
        output_cfg = self.template.output

        if output_cfg.is_array:
            # Extract array from response
            if output_cfg.array_path:
                items = YamlLoader.extract_nested_value(data, output_cfg.array_path)
            else:
                items = data

            if isinstance(items, list):
                for item in items:
                    try:
                        results.append(self._build_mapped_result(item))
                    except Exception as e:
                        Logger.info(
                            self.sketch_id,
                            {"message": f"Failed to map array item: {e}"},
                        )
            else:
                Logger.info(
                    self.sketch_id,
                    {
                        "message": f"Expected array response but got {type(items).__name__}"
                    },
                )
        else:
            # Single result
            results.append(self._build_mapped_result(data))

        return results

    async def scan(self, values: List[Any]) -> List[Any]:
        """
        Execute the template for each input value.

        Args:
            values: List of preprocessed input objects

        Returns:
            List of OutputType instances
        """
        results: List[Any] = []

        async with httpx.AsyncClient() as client:
            for input_obj in values:
                try:
                    item_results = await self._process_single_input(client, input_obj)
                    results.extend(item_results)
                except SSRFError as e:
                    Logger.info(
                        self.sketch_id,
                        {"message": f"SSRF blocked: {e}"},
                    )
                    continue
                except TemplateRenderError as e:
                    Logger.info(
                        self.sketch_id,
                        {"message": f"Template render error: {e}"},
                    )
                    continue
                except httpx.HTTPStatusError as e:
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"HTTP error {e.response.status_code} for {self.request.url}: {e}"
                        },
                    )
                    continue
                except httpx.TimeoutException:
                    Logger.info(
                        self.sketch_id,
                        {"message": f"Request timeout for {self.request.url}"},
                    )
                    continue
                except TemplateEnricherError as e:
                    Logger.info(
                        self.sketch_id,
                        {"message": f"Template enricher error: {e}"},
                    )
                    continue
                except Exception as e:
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"Unexpected error processing {self.request.url}: {e}"
                        },
                    )
                    continue

        return results

    def postprocess(self, results: List[Any], input_data: List[Any] = []) -> List[Any]:
        """Log results and return them."""
        for input, output in zip(input_data, results):
            self.create_node(input)
            self.create_node(output)
            self.create_relationship(input, output, "HAS_SOCIAL_ACCOUNT")
            self.log_graph_message(
                f"[{self.template.name.upper()}] {input.nodeLabel} -> {output.nodeLabel}"
            )
        return results


InputType = TemplateEnricher.InputType
OutputType = TemplateEnricher.OutputType
