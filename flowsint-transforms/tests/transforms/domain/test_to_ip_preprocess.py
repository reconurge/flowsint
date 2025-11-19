import pytest
from flowsint_transforms.domain.to_ip import ResolveTransform
from flowsint_types.domain import Domain


@pytest.fixture
def transform():
    """Create transform instance for testing."""
    return ResolveTransform(sketch_id="test_sketch", scan_id="test_scan")


def test_preprocess_valid_objects(transform):
    """Test preprocess with valid Domain objects."""
    inputs = [
        Domain(domain="example.com"),
        Domain(domain="google.com"),
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Domain) for item in result)
    assert result[0].domain == "example.com"
    assert result[1].domain == "google.com"


def test_preprocess_strings(transform):
    """Test preprocess with string inputs (converted via primary field)."""
    inputs = ["example.com", "google.com"]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Domain) for item in result)
    assert result[0].domain == "example.com"
    assert result[1].domain == "google.com"


def test_preprocess_dicts(transform):
    """Test preprocess with dict inputs."""
    inputs = [
        {"domain": "example.com"},
        {"domain": "google.com"},
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Domain) for item in result)
    assert result[0].domain == "example.com"
    assert result[1].domain == "google.com"


def test_preprocess_invalid_filtered(transform):
    """Test that invalid items are filtered out."""
    inputs = [
        Domain(domain="example.com"),
        "invalid domain with spaces",  # Invalid
        Domain(domain="google.com"),
    ]
    result = transform.preprocess(inputs)

    # Only valid items should remain
    assert len(result) == 2
    assert result[0].domain == "example.com"
    assert result[1].domain == "google.com"


def test_preprocess_mixed_formats(transform):
    """Test preprocess with mixed input formats."""
    inputs = [
        Domain(domain="example.com"),  # Object
        "google.com",  # String
        {"domain": "github.com"},  # Dict
        {"invalid_key": "wrong.com"},  # Invalid dict (wrong key)
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 3  # Should have 3 valid items
    assert all(isinstance(item, Domain) for item in result)


def test_preprocess_empty_list(transform):
    """Test preprocess with empty input."""
    result = transform.preprocess([])
    assert result == []
