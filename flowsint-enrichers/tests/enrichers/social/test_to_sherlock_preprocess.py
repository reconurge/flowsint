import pytest
from flowsint_enrichers.social.to_sherlock import SherlockEnricher
from flowsint_types.username import Username


@pytest.fixture
def enricher():
    """Create enricher instance for testing."""
    return SherlockEnricher(sketch_id="test_sketch", scan_id="test_scan")


def test_preprocess_valid_objects(enricher):
    """Test preprocess with valid Username objects."""
    inputs = [
        Username(value="john_doe"),
        Username(value="user123"),
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Username) for item in result)
    assert result[0].value == "john_doe"
    assert result[1].value == "user123"


def test_preprocess_strings(enricher):
    """Test preprocess with string inputs (converted via primary field)."""
    inputs = ["john_doe", "user123"]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Username) for item in result)
    assert result[0].value == "john_doe"
    assert result[1].value == "user123"


def test_preprocess_dicts(enricher):
    """Test preprocess with dict inputs."""
    inputs = [
        {"value": "john_doe"},
        {"value": "user123"},
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Username) for item in result)
    assert result[0].value == "john_doe"
    assert result[1].value == "user123"


def test_preprocess_invalid_filtered(enricher):
    """Test that invalid items are filtered out."""
    inputs = [
        Username(value="john_doe"),
        "ab",  # Invalid (too short, must be 3-30 chars)
        Username(value="user123"),
    ]
    result = enricher.preprocess(inputs)

    # Only valid items should remain
    assert len(result) == 2
    assert result[0].value == "john_doe"
    assert result[1].value == "user123"


def test_preprocess_mixed_formats(enricher):
    """Test preprocess with mixed input formats."""
    inputs = [
        Username(value="john_doe"),  # Object
        "user123",  # String
        {"value": "alice_2023"},  # Dict
        {"invalid_key": "bob_smith"},  # Invalid dict (wrong key)
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 3  # Should have 3 valid items
    assert all(isinstance(item, Username) for item in result)


def test_preprocess_empty_list(enricher):
    """Test preprocess with empty input."""
    result = enricher.preprocess([])
    assert result == []


def test_preprocess_all_invalid(enricher):
    """Test preprocess when all items are invalid."""
    inputs = [
        "ab",  # Too short (min 3 chars)
        "user with spaces",  # Invalid characters
        "a" * 81,  # Too long (max 80 chars)
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 0
