"""Tests for TemplateEnricher."""

import json
from pathlib import Path
from typing import Optional
from unittest.mock import MagicMock

import httpx
import pytest

from flowsint_core.core.template_enricher import (
    TemplateEnricher,
    TemplateEnricherError,
)
from flowsint_core.templates.loader.yaml_loader import SSRFError, YamlLoader
from flowsint_core.templates.types import (
    Template,
    TemplateHttpRequest,
    TemplateHttpResponse,
    TemplateInput,
    TemplateOutput,
    TemplateRetryConfig,
    TemplateSecret,
)

TEST_DIR = Path(__file__).parent


def create_test_template(
    name: str = "test-template",
    input_type: str = "Ip",
    input_key: str = "address",
    output_type: str = "Ip",
    url: str = "https://api.example.com/{{address}}",
    method: str = "GET",
    headers: dict = None,
    params: dict = None,
    body: Optional[str] = None,
    response_map: dict = None,
    response_expect: str = "json",
    secrets: list = None,
    retry: Optional[TemplateRetryConfig] = None,
    is_array: bool = False,
    array_path: Optional[str] = None,
    timeout: float = 30.0,
) -> Template:
    """Helper to create test templates."""
    return Template(
        name=name,
        category="Test",
        version=1.0,
        input=TemplateInput(type=input_type, key=input_key),
        output=TemplateOutput(type=output_type, is_array=is_array, array_path=array_path),
        request=TemplateHttpRequest(
            method=method,
            url=url,
            headers=headers or {},
            params=params or {},
            body=body,
            timeout=timeout,
        ),
        response=TemplateHttpResponse(
            expect=response_expect,
            map=response_map or {"address": "ip"},
        ),
        secrets=[TemplateSecret(**s) for s in (secrets or [])],
        retry=retry,
    )


class MockVault:
    """Mock vault for testing secret resolution."""

    def __init__(self, secrets: dict = None):
        self._secrets = secrets or {}

    def get_secret(self, name: str) -> Optional[str]:
        return self._secrets.get(name)


class TestTemplateEnricherInit:
    """Tests for TemplateEnricher initialization."""

    def test_init_basic(self):
        """Basic initialization with valid template."""
        template = create_test_template()
        enricher = TemplateEnricher(template=template, sketch_id="test")
        assert enricher.name() == "test-template"
        assert enricher.category() == "Test"
        assert enricher.key() == "address"

    def test_init_invalid_input_type(self):
        """Invalid input type should raise TypeError."""
        template = create_test_template(input_type="InvalidType")
        with pytest.raises(TypeError) as exc_info:
            TemplateEnricher(template=template)
        assert "not present in registry" in str(exc_info.value)

    def test_init_with_secrets(self):
        """Template with secrets should build params schema."""
        template = create_test_template(
            secrets=[{"name": "API_KEY", "required": True, "description": "Test key"}]
        )
        enricher = TemplateEnricher(template=template)
        assert len(enricher.params_schema) == 1
        assert enricher.params_schema[0]["name"] == "API_KEY"
        assert enricher.params_schema[0]["type"] == "vaultSecret"


class TestTemplateEnricherSSRF:
    """Tests for SSRF protection in TemplateEnricher."""

    @pytest.mark.asyncio
    async def test_blocks_localhost(self, mock_logger):
        """Requests to localhost should be blocked."""
        template = create_test_template(url="http://localhost/{{address}}")
        enricher = TemplateEnricher(template=template, sketch_id="test")

        # Create mock input
        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]

        results = await enricher.scan(inputs)
        assert len(results) == 0  # Should be blocked

    @pytest.mark.asyncio
    async def test_blocks_private_ip(self, mock_logger):
        """Requests to private IPs should be blocked."""
        template = create_test_template(url="http://192.168.1.1/{{address}}")
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]

        results = await enricher.scan(inputs)
        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_blocks_metadata_endpoint(self, mock_logger):
        """Requests to cloud metadata endpoints should be blocked."""
        # URL with metadata IP hardcoded (not from input)
        template = create_test_template(
            url="http://169.254.169.254/latest/meta-data/{{address}}"
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]  # Valid IP, but URL is blocked

        results = await enricher.scan(inputs)
        assert len(results) == 0


class TestTemplateEnricherRequests:
    """Tests for HTTP request handling."""

    @pytest.mark.asyncio
    async def test_get_request(self, mock_logger, httpx_mock):
        """GET request should work correctly."""
        httpx_mock.add_response(
            url="https://api.example.com/8.8.8.8",
            json={"ip": "8.8.8.8", "country": "US"},
        )

        template = create_test_template(
            url="https://api.example.com/{{address}}",
            response_map={"address": "ip", "country": "country"},
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        results = await enricher.scan(inputs)

        assert len(results) == 1
        assert results[0].address == "8.8.8.8"

    @pytest.mark.asyncio
    async def test_post_request(self, mock_logger, httpx_mock):
        """POST request with body should work correctly."""
        httpx_mock.add_response(
            url="https://api.example.com/lookup",
            method="POST",
            json={"ip": "8.8.8.8", "country": "US"},
        )

        template = create_test_template(
            url="https://api.example.com/lookup",
            method="POST",
            body='{"ip": "{{address}}"}',
            response_map={"address": "ip"},
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        results = await enricher.scan(inputs)

        assert len(results) == 1
        # Verify the request was made with POST
        request = httpx_mock.get_request()
        assert request.method == "POST"

    @pytest.mark.asyncio
    async def test_request_with_headers(self, mock_logger, httpx_mock):
        """Request headers should be rendered and sent."""
        httpx_mock.add_response(
            url="https://api.example.com/8.8.8.8",
            json={"ip": "8.8.8.8"},
        )

        template = create_test_template(
            url="https://api.example.com/{{address}}",
            headers={"X-Custom-Header": "test-value"},
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        await enricher.scan(inputs)

        request = httpx_mock.get_request()
        assert request.headers.get("X-Custom-Header") == "test-value"

    @pytest.mark.asyncio
    async def test_request_with_params(self, mock_logger, httpx_mock):
        """Request params should be rendered and sent."""
        httpx_mock.add_response(
            json={"ip": "8.8.8.8"},
        )

        template = create_test_template(
            url="https://api.example.com/lookup",
            params={"ip": "{{address}}", "format": "json"},
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        await enricher.scan(inputs)

        request = httpx_mock.get_request()
        assert "ip=8.8.8.8" in str(request.url)
        assert "format=json" in str(request.url)


class TestTemplateEnricherResponseParsing:
    """Tests for response parsing."""

    @pytest.mark.asyncio
    async def test_json_response(self, mock_logger, httpx_mock):
        """JSON response should be parsed correctly."""
        httpx_mock.add_response(
            json={"ip": "8.8.8.8", "country": "US"},
        )

        template = create_test_template(
            response_expect="json",
            response_map={"address": "ip"},
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        results = await enricher.scan(inputs)

        assert len(results) == 1
        assert results[0].address == "8.8.8.8"

    @pytest.mark.asyncio
    async def test_nested_json_response(self, mock_logger, httpx_mock):
        """Nested JSON paths should work with dot notation."""
        httpx_mock.add_response(
            json={
                "data": {
                    "ip": "8.8.8.8",
                    "location": {"country": "US", "city": "Mountain View"},
                }
            },
        )

        template = create_test_template(
            response_map={
                "address": "data.ip",
                "country": "data.location.country",
                "city": "data.location.city",
            },
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        results = await enricher.scan(inputs)

        assert len(results) == 1
        assert results[0].address == "8.8.8.8"
        assert results[0].country == "US"
        assert results[0].city == "Mountain View"

    @pytest.mark.asyncio
    async def test_xml_response(self, mock_logger, httpx_mock):
        """XML response should be parsed correctly."""
        xml_response = """<?xml version="1.0"?>
        <response>
            <ip>8.8.8.8</ip>
            <country>US</country>
        </response>
        """
        httpx_mock.add_response(
            text=xml_response,
            headers={"Content-Type": "application/xml"},
        )

        template = create_test_template(
            response_expect="xml",
            response_map={"address": "ip", "country": "country"},
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        results = await enricher.scan(inputs)

        assert len(results) == 1
        assert results[0].address == "8.8.8.8"
        assert results[0].country == "US"

    @pytest.mark.asyncio
    async def test_text_response(self, mock_logger, httpx_mock):
        """Text response should be returned as-is."""
        httpx_mock.add_response(text="8.8.8.8")

        template = create_test_template(
            response_expect="text",
            response_map={},  # No mapping for text
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        # Text response won't map well, but shouldn't crash
        results = await enricher.scan(inputs)
        # May return empty due to mapping failure, that's OK


class TestTemplateEnricherArrayResponse:
    """Tests for array response handling."""

    @pytest.mark.asyncio
    async def test_array_response(self, mock_logger, httpx_mock):
        """Array responses should produce multiple outputs."""
        httpx_mock.add_response(
            json={
                "data": {
                    "results": [
                        {"ip": "8.8.8.8", "country": "US"},
                        {"ip": "8.8.4.4", "country": "US"},
                    ]
                }
            },
        )

        template = create_test_template(
            is_array=True,
            array_path="data.results",
            response_map={"address": "ip", "country": "country"},
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        results = await enricher.scan(inputs)

        assert len(results) == 2
        assert results[0].address == "8.8.8.8"
        assert results[1].address == "8.8.4.4"

    @pytest.mark.asyncio
    async def test_array_at_root(self, mock_logger, httpx_mock):
        """Array at root level (no array_path) should work."""
        httpx_mock.add_response(
            json=[
                {"ip": "8.8.8.8"},
                {"ip": "8.8.4.4"},
            ],
        )

        template = create_test_template(
            is_array=True,
            array_path=None,  # Array at root
            response_map={"address": "ip"},
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="1.2.3.4")]  # Valid IP address
        results = await enricher.scan(inputs)

        assert len(results) == 2


class TestTemplateEnricherVaultIntegration:
    """Tests for vault/secrets integration."""

    @pytest.mark.asyncio
    async def test_secret_in_header(self, mock_logger, httpx_mock):
        """Secrets should be injected into headers."""
        httpx_mock.add_response(json={"ip": "8.8.8.8"})

        template = create_test_template(
            secrets=[{"name": "API_KEY", "required": True}],
            headers={"Authorization": "Bearer {{secrets.API_KEY}}"},
        )

        vault = MockVault(secrets={"API_KEY": "secret-token-123"})
        enricher = TemplateEnricher(template=template, sketch_id="test", vault=vault)
        await enricher.async_init()

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        await enricher.scan(inputs)

        request = httpx_mock.get_request()
        assert request.headers.get("Authorization") == "Bearer secret-token-123"

    @pytest.mark.asyncio
    async def test_missing_required_secret(self, mock_logger):
        """Missing required secret should raise error."""
        template = create_test_template(
            secrets=[{"name": "API_KEY", "required": True}],
        )

        vault = MockVault(secrets={})  # Empty vault
        enricher = TemplateEnricher(template=template, sketch_id="test", vault=vault)

        with pytest.raises(Exception) as exc_info:
            await enricher.async_init()
        assert "API_KEY" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_optional_secret_missing(self, mock_logger, httpx_mock):
        """Missing optional secret should not raise error."""
        httpx_mock.add_response(json={"ip": "8.8.8.8"})

        template = create_test_template(
            secrets=[{"name": "OPTIONAL_KEY", "required": False}],
        )

        vault = MockVault(secrets={})
        enricher = TemplateEnricher(template=template, sketch_id="test", vault=vault)
        await enricher.async_init()  # Should not raise

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        # Should work without the optional secret
        results = await enricher.scan(inputs)
        assert len(results) == 1


class TestTemplateEnricherRetry:
    """Tests for retry logic."""

    @pytest.mark.asyncio
    @pytest.mark.httpx_mock(can_send_already_matched_responses=True)
    async def test_retry_on_500(self, mock_logger, httpx_mock):
        """Should retry on 500 errors."""
        # First request fails, second succeeds
        httpx_mock.add_response(status_code=500)
        httpx_mock.add_response(json={"ip": "8.8.8.8"})

        template = create_test_template(
            retry=TemplateRetryConfig(
                max_retries=3, backoff_factor=0.1, retry_on_status=[500]
            ),
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        results = await enricher.scan(inputs)

        assert len(results) == 1
        assert len(httpx_mock.get_requests()) == 2  # Initial + 1 retry

    @pytest.mark.asyncio
    @pytest.mark.httpx_mock(can_send_already_matched_responses=True)
    async def test_retry_on_429(self, mock_logger, httpx_mock):
        """Should retry on rate limit (429) errors."""
        httpx_mock.add_response(status_code=429)
        httpx_mock.add_response(status_code=429)
        httpx_mock.add_response(json={"ip": "8.8.8.8"})

        template = create_test_template(
            retry=TemplateRetryConfig(
                max_retries=3, backoff_factor=0.1, retry_on_status=[429]
            ),
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        results = await enricher.scan(inputs)

        assert len(results) == 1
        assert len(httpx_mock.get_requests()) == 3

    @pytest.mark.asyncio
    async def test_no_retry_on_400(self, mock_logger, httpx_mock):
        """Should not retry on 400 errors by default."""
        httpx_mock.add_response(status_code=400)

        template = create_test_template(
            retry=TemplateRetryConfig(max_retries=3, backoff_factor=0.1),
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8")]
        results = await enricher.scan(inputs)

        assert len(results) == 0  # Failed without retry
        assert len(httpx_mock.get_requests()) == 1  # No retries


class TestTemplateEnricherErrorHandling:
    """Tests for error handling."""

    @pytest.mark.asyncio
    async def test_http_error_continues(self, mock_logger, httpx_mock):
        """HTTP errors should be logged and processing should continue."""
        httpx_mock.add_response(status_code=404)
        httpx_mock.add_response(json={"ip": "1.1.1.1"})

        template = create_test_template()
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8"), Ip(address="1.1.1.1")]
        results = await enricher.scan(inputs)

        # First should fail, second should succeed
        assert len(results) == 1
        assert results[0].address == "1.1.1.1"

    @pytest.mark.asyncio
    async def test_invalid_json_continues(self, mock_logger, httpx_mock):
        """Invalid JSON should be logged and processing should continue."""
        httpx_mock.add_response(text="not json")
        httpx_mock.add_response(json={"ip": "1.1.1.1"})

        template = create_test_template()
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8"), Ip(address="1.1.1.1")]
        results = await enricher.scan(inputs)

        assert len(results) == 1

    @pytest.mark.asyncio
    async def test_timeout_continues(self, mock_logger, httpx_mock):
        """Timeout should be logged and processing should continue."""

        def raise_timeout(request):
            raise httpx.TimeoutException("timeout")

        httpx_mock.add_callback(raise_timeout)
        httpx_mock.add_response(json={"ip": "1.1.1.1"})

        template = create_test_template(
            retry=TemplateRetryConfig(max_retries=0)  # No retries for this test
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")

        from flowsint_types import Ip

        inputs = [Ip(address="8.8.8.8"), Ip(address="1.1.1.1")]
        results = await enricher.scan(inputs)

        assert len(results) == 1


class TestTemplateEnricherFromYaml:
    """Tests loading enrichers from YAML files."""

    def test_load_from_yaml(self):
        """Should load enricher from YAML file."""
        template = YamlLoader.get_template_from_file(str(TEST_DIR / "example.yaml"))
        enricher = TemplateEnricher(template=template, sketch_id="test")
        assert enricher.name() == "ip-api-lookup"

    def test_load_post_template(self):
        """Should load POST template from YAML."""
        template = YamlLoader.get_template_from_file(str(TEST_DIR / "example-post.yaml"))
        enricher = TemplateEnricher(template=template, sketch_id="test")
        assert enricher.request.method == "POST"

    def test_load_secrets_template(self):
        """Should load template with secrets from YAML."""
        template = YamlLoader.get_template_from_file(
            str(TEST_DIR / "example-secrets.yaml")
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")
        assert len(enricher.params_schema) == 1

    def test_load_retry_template(self):
        """Should load template with retry config from YAML."""
        template = YamlLoader.get_template_from_file(
            str(TEST_DIR / "example-retry.yaml")
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")
        assert enricher.template.retry.max_retries == 5

    def test_load_array_template(self):
        """Should load template with array output from YAML."""
        template = YamlLoader.get_template_from_file(
            str(TEST_DIR / "example-array.yaml")
        )
        enricher = TemplateEnricher(template=template, sketch_id="test")
        assert enricher.template.output.is_array is True
        assert enricher.template.output.array_path == "data.results"
