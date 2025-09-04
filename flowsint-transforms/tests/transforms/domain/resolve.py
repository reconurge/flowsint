from flowsint_transforms.domains.resolve import ResolveTransform
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip
from typing import List
import pytest

transform = ResolveTransform("sketch_123", "scan_123")


def test_preprocess_valid_domains():
    domains = [
        Domain(domain="example.com"),
        Domain(domain="example2.com"),
    ]
    result = transform.preprocess(domains)

    result_domains = [d.domain for d in result]
    expected_domains = [d.domain for d in domains]

    assert result_domains == expected_domains


def test_unprocessed_valid_domains():
    domains = [
        "example.com",
        "example2.com",
    ]
    result = transform.preprocess(domains)
    result_domains = [d for d in result]
    expected_domains = [Domain(domain=d) for d in domains]
    assert result_domains == expected_domains


def test_preprocess_invalid_domains():
    domains = [
        Domain(domain="example.com"),
        Domain(domain="invalid_domain"),
        Domain(domain="example.org"),
    ]
    result = transform.preprocess(domains)

    result_domains = [d.domain for d in result]
    assert "example.com" in result_domains
    assert "example.org" in result_domains
    assert "invalid_domain" not in result_domains


def test_preprocess_multiple_formats():
    domains = [
        {"domain": "example.com"},
        {"invalid_key": "example.io"},
        Domain(domain="example.org"),
        "example.org",
    ]
    result = transform.preprocess(domains)

    result_domains = [d.domain for d in result]
    assert "example.com" in result_domains
    assert "example.org" in result_domains
    assert "invalid_domain" not in result_domains
    assert "example.io" not in result_domains


@pytest.mark.asyncio
async def test_scan_returns_ip(monkeypatch):
    # on crée une fonction mock qui retourne une IP
    def mock_gethostbyname(domain):
        return "12.23.34.45"

    monkeypatch.setattr("socket.gethostbyname", mock_gethostbyname)

    input_data = [Domain(domain="example.com")]
    output = await transform.execute(input_data)
    print(output)
    assert isinstance(output, list)
    assert output[0].address == "12.23.34.45"


def test_schemas():
    input_schema = transform.input_schema()
    output_schema = transform.output_schema()

    # Test the structure and key properties rather than exact match
    assert input_schema["type"] == "Domain"
    assert isinstance(input_schema["properties"], list)
    input_property_names = [prop["name"] for prop in input_schema["properties"]]
    assert "domain" in input_property_names

    assert output_schema["type"] == "Ip"
    assert isinstance(output_schema["properties"], list)
    output_property_names = [prop["name"] for prop in output_schema["properties"]]
    assert "address" in output_property_names


class TestResolveInputOutputTypes:
    """Test the InputType/OutputType functionality for ResolveTransform"""

    def test_input_output_types_are_defined(self):
        """Test that InputType and OutputType are properly defined"""
        assert hasattr(ResolveTransform, "InputType")
        assert hasattr(ResolveTransform, "OutputType")
        assert ResolveTransform.InputType == List[Domain]
        assert ResolveTransform.OutputType == List[Ip]

    def test_schemas_use_generate_methods(self):
        """Test that schema methods use the new generate methods"""
        # These should work without error
        input_schema = ResolveTransform.generate_input_schema()
        output_schema = ResolveTransform.generate_output_schema()

        assert isinstance(input_schema, dict)
        assert isinstance(output_schema, dict)
        assert input_schema["type"] == "Domain"
        assert output_schema["type"] == "Ip"

    def test_schema_methods_return_same_as_generate_methods(self):
        """Test that input_schema() and output_schema() return the same as generate methods"""
        assert ResolveTransform.input_schema() == ResolveTransform.generate_input_schema()
        assert ResolveTransform.output_schema() == ResolveTransform.generate_output_schema()

    def test_input_schema_properties(self):
        """Test input schema has expected properties"""
        schema = ResolveTransform.input_schema()

        properties = schema["properties"]
        property_names = [p["name"] for p in properties]

        # Domain should have these properties
        assert "domain" in property_names

    def test_output_schema_properties(self):
        """Test output schema has expected properties"""
        schema = ResolveTransform.output_schema()

        properties = schema["properties"]
        property_names = [p["name"] for p in properties]

        # Ip should have these properties
        assert "address" in property_names

    def test_type_accessibility_from_instance(self):
        """Test that types are accessible from transform instance"""
        transform_instance = ResolveTransform("test", "test")

        assert transform_instance.InputType == List[Domain]
        assert transform_instance.OutputType == List[Ip]

        # Should be able to generate schemas from instance
        input_schema = transform_instance.generate_input_schema()
        output_schema = transform_instance.generate_output_schema()

        assert input_schema["type"] == "Domain"
        assert output_schema["type"] == "Ip"
