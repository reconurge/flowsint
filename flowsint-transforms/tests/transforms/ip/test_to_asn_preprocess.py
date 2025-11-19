import pytest
from flowsint_transforms.ip.to_asn import IpToAsnTransform
from flowsint_types.ip import Ip


@pytest.fixture
def transform():
    """Create transform instance for testing."""
    return IpToAsnTransform(sketch_id="test_sketch", scan_id="test_scan")


def test_preprocess_valid_objects(transform):
    """Test preprocess with valid Ip objects."""
    inputs = [
        Ip(address="8.8.8.8"),
        Ip(address="1.1.1.1"),
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Ip) for item in result)
    assert result[0].address == "8.8.8.8"
    assert result[1].address == "1.1.1.1"


def test_preprocess_strings(transform):
    """Test preprocess with string inputs (converted via primary field)."""
    inputs = ["8.8.8.8", "1.1.1.1"]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Ip) for item in result)
    assert result[0].address == "8.8.8.8"
    assert result[1].address == "1.1.1.1"


def test_preprocess_dicts(transform):
    """Test preprocess with dict inputs."""
    inputs = [
        {"address": "8.8.8.8"},
        {"address": "1.1.1.1"},
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Ip) for item in result)
    assert result[0].address == "8.8.8.8"
    assert result[1].address == "1.1.1.1"


def test_preprocess_invalid_filtered(transform):
    """Test that invalid items are filtered out."""
    inputs = [
        Ip(address="8.8.8.8"),
        "not-an-ip",  # Invalid
        Ip(address="1.1.1.1"),
    ]
    result = transform.preprocess(inputs)

    # Only valid items should remain
    assert len(result) == 2
    assert result[0].address == "8.8.8.8"
    assert result[1].address == "1.1.1.1"


def test_preprocess_mixed_formats(transform):
    """Test preprocess with mixed input formats."""
    inputs = [
        Ip(address="8.8.8.8"),  # Object
        "1.1.1.1",  # String
        {"address": "192.168.1.1"},  # Dict
        {"invalid_key": "10.0.0.1"},  # Invalid dict (wrong key)
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 3  # Should have 3 valid items
    assert all(isinstance(item, Ip) for item in result)


def test_preprocess_empty_list(transform):
    """Test preprocess with empty input."""
    result = transform.preprocess([])
    assert result == []
