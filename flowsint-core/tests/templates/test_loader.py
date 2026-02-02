"""Tests for YamlLoader and related utilities."""

import json
from pathlib import Path

import pytest

from flowsint_core.templates.loader.yaml_loader import (
    BLOCKED_HOSTNAMES,
    SSRFError,
    TemplateRenderError,
    YamlLoader,
    is_ip_blocked,
    sanitize_url_component,
    validate_url_safe,
)
from flowsint_core.templates.types import Template

TEST_DIR = Path(__file__).parent


class TestYamlLoader:
    """Tests for YAML loading and template parsing."""

    def test_yaml_loader_valid_template(self):
        """Load a valid template and verify its properties."""
        file = YamlLoader.get_template_from_file(str(TEST_DIR / "example.yaml"))
        assert isinstance(file, Template)
        assert file.name == "ip-api-lookup"
        assert file.category == "Ip"
        assert file.request.params == {"fields": "query,status,country,city,lat,lon,isp"}
        assert file.request.method == "GET"

    def test_yaml_loader_invalid_method(self):
        """Invalid HTTP method should raise ValueError."""
        with pytest.raises(ValueError) as exc_info:
            YamlLoader.get_template_from_file(str(TEST_DIR / "example-invalid.yaml"))
        assert "not present in" in str(exc_info.value).lower()

    def test_yaml_loader_post_method(self):
        """POST method should be allowed."""
        file = YamlLoader.get_template_from_file(str(TEST_DIR / "example-post.yaml"))
        assert file.request.method == "POST"

    def test_yaml_loader_with_secrets(self):
        """Template with secrets should parse correctly."""
        file = YamlLoader.get_template_from_file(str(TEST_DIR / "example-secrets.yaml"))
        assert len(file.secrets) == 1
        assert file.secrets[0].name == "API_KEY"
        assert file.secrets[0].required is True

    def test_yaml_loader_with_retry_config(self):
        """Template with retry config should parse correctly."""
        file = YamlLoader.get_template_from_file(str(TEST_DIR / "example-retry.yaml"))
        assert file.retry is not None
        assert file.retry.max_retries == 5
        assert file.retry.backoff_factor == 1.0

    def test_yaml_loader_array_output(self):
        """Template with array output should parse correctly."""
        file = YamlLoader.get_template_from_file(str(TEST_DIR / "example-array.yaml"))
        assert file.output.is_array is True
        assert file.output.array_path == "data.results"


class TestRenderTemplate:
    """Tests for template string rendering."""

    def test_render_simple(self):
        """Simple variable substitution."""
        url_template = "http://ip-api.com/json/{{address}}"
        url = YamlLoader.render_template(url_template, {"address": "8.8.8.8"})
        assert url == "http://ip-api.com/json/8.8.8.8"

    def test_render_multiple_variables(self):
        """Multiple variables in one template."""
        url_template = "http://api.example.com?ip={{address}}&domain={{domain}}"
        url = YamlLoader.render_template(
            url_template, {"address": "8.8.8.8", "domain": "example.com"}
        )
        assert url == "http://api.example.com?ip=8.8.8.8&domain=example.com"

    def test_render_with_spaces(self):
        """Variables with spaces around them."""
        url_template = "http://api.example.com/{{ username }}"
        url = YamlLoader.render_template(url_template, {"username": "testuser"})
        assert url == "http://api.example.com/testuser"

    def test_render_missing_variable(self):
        """Missing variable should raise TemplateRenderError."""
        url_template = "http://api.example.com/{{username}}"
        with pytest.raises(TemplateRenderError) as exc_info:
            YamlLoader.render_template(url_template, {})
        assert "Missing template variable: username" in str(exc_info.value)

    def test_render_sanitizes_special_chars(self):
        """Special characters should be URL-encoded by default."""
        url_template = "http://api.example.com/{{query}}"
        url = YamlLoader.render_template(url_template, {"query": "foo bar&baz=1"})
        assert "foo%20bar%26baz%3D1" in url

    def test_render_no_sanitize(self):
        """Sanitization can be disabled."""
        url_template = "http://api.example.com/{{query}}"
        url = YamlLoader.render_template(
            url_template, {"query": "foo bar"}, sanitize=False
        )
        assert url == "http://api.example.com/foo bar"

    def test_render_secrets_variable(self):
        """secrets.NAME variables should work."""
        template = "Bearer {{secrets.API_KEY}}"
        result = YamlLoader.render_template(
            template, {"secrets.API_KEY": "secret123"}, sanitize=False
        )
        assert result == "Bearer secret123"


class TestRenderDict:
    """Tests for recursive dictionary rendering."""

    def test_render_dict_simple(self):
        """Simple dict with string values."""
        data = {"key": "{{value}}"}
        result = YamlLoader.render_dict(data, {"value": "test"})
        assert result == {"key": "test"}

    def test_render_dict_nested(self):
        """Nested dict rendering."""
        data = {"outer": {"inner": "{{value}}"}}
        result = YamlLoader.render_dict(data, {"value": "test"})
        assert result == {"outer": {"inner": "test"}}

    def test_render_dict_with_list(self):
        """Dict with list values."""
        data = {"items": ["{{a}}", "{{b}}"]}
        result = YamlLoader.render_dict(data, {"a": "1", "b": "2"})
        assert result == {"items": ["1", "2"]}

    def test_render_dict_preserves_non_string(self):
        """Non-string values should be preserved."""
        data = {"count": 42, "active": True, "name": "{{name}}"}
        result = YamlLoader.render_dict(data, {"name": "test"})
        assert result == {"count": 42, "active": True, "name": "test"}


class TestExtractNestedValue:
    """Tests for dot-notation value extraction."""

    def test_extract_simple(self):
        """Simple key extraction."""
        data = {"name": "John"}
        assert YamlLoader.extract_nested_value(data, "name") == "John"

    def test_extract_nested(self):
        """Nested key extraction."""
        data = {"user": {"name": "John", "address": {"city": "NYC"}}}
        assert YamlLoader.extract_nested_value(data, "user.name") == "John"
        assert YamlLoader.extract_nested_value(data, "user.address.city") == "NYC"

    def test_extract_array_index(self):
        """Array index extraction."""
        data = {"items": ["a", "b", "c"]}
        assert YamlLoader.extract_nested_value(data, "items.0") == "a"
        assert YamlLoader.extract_nested_value(data, "items.2") == "c"

    def test_extract_array_of_objects(self):
        """Extract from array of objects."""
        data = {"users": [{"name": "Alice"}, {"name": "Bob"}]}
        assert YamlLoader.extract_nested_value(data, "users.0.name") == "Alice"
        assert YamlLoader.extract_nested_value(data, "users.1.name") == "Bob"

    def test_extract_missing_key(self):
        """Missing key returns None."""
        data = {"name": "John"}
        assert YamlLoader.extract_nested_value(data, "missing") is None
        assert YamlLoader.extract_nested_value(data, "name.missing") is None

    def test_extract_empty_path(self):
        """Empty path returns the data itself."""
        data = {"name": "John"}
        assert YamlLoader.extract_nested_value(data, "") == data

    def test_extract_out_of_bounds(self):
        """Out of bounds array index returns None."""
        data = {"items": ["a", "b"]}
        assert YamlLoader.extract_nested_value(data, "items.5") is None


class TestSSRFProtection:
    """Tests for SSRF protection utilities."""

    def test_is_ip_blocked_loopback(self):
        """Loopback addresses should be blocked."""
        assert is_ip_blocked("127.0.0.1") is True
        assert is_ip_blocked("127.0.0.2") is True
        assert is_ip_blocked("127.255.255.255") is True

    def test_is_ip_blocked_private_ranges(self):
        """Private IP ranges should be blocked."""
        assert is_ip_blocked("10.0.0.1") is True
        assert is_ip_blocked("10.255.255.255") is True
        assert is_ip_blocked("172.16.0.1") is True
        assert is_ip_blocked("172.31.255.255") is True
        assert is_ip_blocked("192.168.0.1") is True
        assert is_ip_blocked("192.168.255.255") is True

    def test_is_ip_blocked_link_local(self):
        """Link-local (metadata) addresses should be blocked."""
        assert is_ip_blocked("169.254.169.254") is True
        assert is_ip_blocked("169.254.0.1") is True

    def test_is_ip_blocked_public(self):
        """Public IPs should not be blocked."""
        assert is_ip_blocked("8.8.8.8") is False
        assert is_ip_blocked("1.1.1.1") is False
        assert is_ip_blocked("93.184.216.34") is False

    def test_is_ip_blocked_invalid(self):
        """Invalid IP strings return False (not blocked)."""
        assert is_ip_blocked("not-an-ip") is False
        assert is_ip_blocked("") is False

    def test_validate_url_safe_public(self):
        """Public URLs should pass validation."""
        validate_url_safe("https://api.example.com/endpoint")
        validate_url_safe("http://8.8.8.8/test")

    def test_validate_url_safe_localhost(self):
        """Localhost should be blocked."""
        with pytest.raises(SSRFError) as exc_info:
            validate_url_safe("http://localhost/admin")
        assert "Blocked hostname" in str(exc_info.value)

    def test_validate_url_safe_private_ip(self):
        """Private IPs should be blocked."""
        with pytest.raises(SSRFError):
            validate_url_safe("http://192.168.1.1/admin")
        with pytest.raises(SSRFError):
            validate_url_safe("http://10.0.0.1/internal")
        with pytest.raises(SSRFError):
            validate_url_safe("http://172.16.0.1/secret")

    def test_validate_url_safe_metadata(self):
        """Cloud metadata endpoints should be blocked."""
        with pytest.raises(SSRFError):
            validate_url_safe("http://169.254.169.254/latest/meta-data/")
        with pytest.raises(SSRFError):
            validate_url_safe("http://metadata.google.internal/")

    def test_validate_url_safe_file_scheme(self):
        """File scheme should be blocked."""
        with pytest.raises(SSRFError):
            validate_url_safe("file:///etc/passwd")
        # Either "no hostname" or "Blocked URL scheme" is acceptable

    def test_validate_url_safe_no_hostname(self):
        """URL without hostname should be blocked."""
        with pytest.raises(SSRFError) as exc_info:
            validate_url_safe("/just/a/path")
        assert "no hostname" in str(exc_info.value)


class TestSanitizeUrlComponent:
    """Tests for URL component sanitization."""

    def test_sanitize_alphanumeric(self):
        """Alphanumeric strings pass through."""
        assert sanitize_url_component("hello123") == "hello123"

    def test_sanitize_spaces(self):
        """Spaces are encoded."""
        assert sanitize_url_component("hello world") == "hello%20world"

    def test_sanitize_special_chars(self):
        """Special characters are encoded."""
        result = sanitize_url_component("a&b=c?d#e")
        assert "&" not in result
        assert "=" not in result
        assert "?" not in result
        assert "#" not in result

    def test_sanitize_safe_chars(self):
        """Safe characters are preserved."""
        assert sanitize_url_component("a-b_c.d~e") == "a-b_c.d~e"

    def test_sanitize_path_traversal(self):
        """Path traversal attempts are neutralized."""
        result = sanitize_url_component("../../../etc/passwd")
        assert ".." not in result or "%2F" in result  # Either .. is encoded or / is
