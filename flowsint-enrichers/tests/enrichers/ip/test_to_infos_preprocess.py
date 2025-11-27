import pytest
from flowsint_enrichers.ip.to_infos import IpToInfosEnricher
from flowsint_types.ip import Ip


@pytest.fixture
def enricher():
    """Create enricher instance for testing."""
    return IpToInfosEnricher(sketch_id="test_sketch", scan_id="test_scan")


def test_preprocess_valid_objects(enricher):
    """Test preprocess with valid Ip objects."""
    inputs = [
        Ip(address="8.8.8.8"),
        Ip(address="1.1.1.1"),
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Ip) for item in result)
    assert result[0].address == "8.8.8.8"
    assert result[1].address == "1.1.1.1"


def test_preprocess_strings(enricher):
    """Test preprocess with string inputs (converted via primary field)."""
    inputs = ["8.8.8.8", "1.1.1.1"]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Ip) for item in result)
    assert result[0].address == "8.8.8.8"
    assert result[1].address == "1.1.1.1"


def test_preprocess_dicts(enricher):
    """Test preprocess with dict inputs."""
    inputs = [
        {"address": "8.8.8.8"},
        {"address": "1.1.1.1"},
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Ip) for item in result)
    assert result[0].address == "8.8.8.8"
    assert result[1].address == "1.1.1.1"


def test_preprocess_invalid_filtered(enricher):
    """Test that invalid items are filtered out."""
    inputs = [
        Ip(address="8.8.8.8"),
        "999.999.999.999",  # Invalid
        Ip(address="1.1.1.1"),
    ]
    result = enricher.preprocess(inputs)

    # Only valid items should remain
    assert len(result) == 2
    assert result[0].address == "8.8.8.8"
    assert result[1].address == "1.1.1.1"


def test_preprocess_mixed_formats(enricher):
    """Test preprocess with mixed input formats."""
    inputs = [
        Ip(address="8.8.8.8"),  # Object
        "1.1.1.1",  # String
        {"address": "192.168.1.1"},  # Dict
        {"invalid_key": "10.0.0.1"},  # Invalid dict (wrong key)
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 3  # Should have 3 valid items
    assert all(isinstance(item, Ip) for item in result)
    assert result[0].address == "8.8.8.8"
    assert result[1].address == "1.1.1.1"
    assert result[2].address == "192.168.1.1"


def test_preprocess_empty_list(enricher):
    """Test preprocess with empty input."""
    result = enricher.preprocess([])
    assert result == []


def test_preprocess_all_invalid(enricher):
    """Test preprocess when all items are invalid."""
    inputs = [
        "not-an-ip",
        "999.999.999.999",
        "invalid",
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 0
