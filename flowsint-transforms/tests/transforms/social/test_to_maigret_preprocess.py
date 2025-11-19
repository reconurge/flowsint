import pytest
from flowsint_transforms.social.to_maigret import MaigretTransform
from flowsint_types.username import Username


@pytest.fixture
def transform():
    """Create transform instance for testing."""
    return MaigretTransform(sketch_id="test_sketch", scan_id="test_scan")


def test_preprocess_valid_objects(transform):
    """Test preprocess with valid Username objects."""
    inputs = [
        Username(value="john_doe"),
        Username(value="user123"),
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Username) for item in result)
    assert result[0].value == "john_doe"
    assert result[1].value == "user123"


def test_preprocess_strings(transform):
    """Test preprocess with string inputs (converted via primary field)."""
    inputs = ["john_doe", "user123"]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Username) for item in result)
    assert result[0].value == "john_doe"
    assert result[1].value == "user123"


def test_preprocess_dicts(transform):
    """Test preprocess with dict inputs."""
    inputs = [
        {"value": "john_doe"},
        {"value": "user123"},
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Username) for item in result)
    assert result[0].value == "john_doe"
    assert result[1].value == "user123"


def test_preprocess_invalid_filtered(transform):
    """Test that invalid items are filtered out."""
    inputs = [
        Username(value="john_doe"),
        "ab",  # Invalid (too short, must be 3-30 chars)
        Username(value="user123"),
    ]
    result = transform.preprocess(inputs)

    # Only valid items should remain
    assert len(result) == 2
    assert result[0].value == "john_doe"
    assert result[1].value == "user123"


def test_preprocess_mixed_formats(transform):
    """Test preprocess with mixed input formats."""
    inputs = [
        Username(value="john_doe"),  # Object
        "user123",  # String
        {"value": "alice_2023"},  # Dict
        {"invalid_key": "bob_smith"},  # Invalid dict (wrong key)
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 3  # Should have 3 valid items
    assert all(isinstance(item, Username) for item in result)


def test_preprocess_empty_list(transform):
    """Test preprocess with empty input."""
    result = transform.preprocess([])
    assert result == []


def test_preprocess_all_invalid(transform):
    """Test preprocess when all items are invalid."""
    inputs = [
        "ab",  # Too short
        "user with spaces",  # Invalid characters
        "",  # Empty
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 0


def test_preprocess_with_platform(transform):
    """Test preprocess with username including platform."""
    inputs = [
        {"value": "john_doe", "platform": "twitter"},
        {"value": "user123", "platform": "github"},
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Username) for item in result)
    assert result[0].value == "john_doe"
    assert result[0].platform == "twitter"
    assert result[1].value == "user123"
    assert result[1].platform == "github"
