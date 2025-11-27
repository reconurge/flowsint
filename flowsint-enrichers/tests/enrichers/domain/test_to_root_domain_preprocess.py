import pytest
from flowsint_enrichers.domain.to_root_domain import DomainToRootDomain
from flowsint_types.domain import Domain


@pytest.fixture
def enricher():
    """Create enricher instance for testing."""
    return DomainToRootDomain(sketch_id="test_sketch", scan_id="test_scan")


def test_preprocess_valid_objects(enricher):
    """Test preprocess with valid Domain objects."""
    inputs = [
        Domain(domain="subdomain.example.com"),
        Domain(domain="www.google.com"),
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Domain) for item in result)
    assert result[0].domain == "subdomain.example.com"
    assert result[1].domain == "www.google.com"


def test_preprocess_strings(enricher):
    """Test preprocess with string inputs (converted via primary field)."""
    inputs = ["subdomain.example.com", "www.google.com"]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Domain) for item in result)
    assert result[0].domain == "subdomain.example.com"
    assert result[1].domain == "www.google.com"


def test_preprocess_dicts(enricher):
    """Test preprocess with dict inputs."""
    inputs = [
        {"domain": "subdomain.example.com"},
        {"domain": "www.google.com"},
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Domain) for item in result)
    assert result[0].domain == "subdomain.example.com"
    assert result[1].domain == "www.google.com"


def test_preprocess_invalid_filtered(enricher):
    """Test that invalid items are filtered out."""
    inputs = [
        Domain(domain="example.com"),
        "not a domain",  # Invalid
        Domain(domain="google.com"),
    ]
    result = enricher.preprocess(inputs)

    # Only valid items should remain
    assert len(result) == 2
    assert result[0].domain == "example.com"
    assert result[1].domain == "google.com"


def test_preprocess_mixed_formats(enricher):
    """Test preprocess with mixed input formats."""
    inputs = [
        Domain(domain="subdomain.example.com"),  # Object
        "www.google.com",  # String
        {"domain": "api.github.com"},  # Dict
        {"invalid_key": "wrong.com"},  # Invalid dict (wrong key)
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 3  # Should have 3 valid items
    assert all(isinstance(item, Domain) for item in result)


def test_preprocess_empty_list(enricher):
    """Test preprocess with empty input."""
    result = enricher.preprocess([])
    assert result == []
