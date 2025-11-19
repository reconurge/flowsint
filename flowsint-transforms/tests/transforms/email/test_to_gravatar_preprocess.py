import pytest
from flowsint_transforms.email.to_gravatar import EmailToGravatarTransform
from flowsint_types.email import Email


@pytest.fixture
def transform():
    """Create transform instance for testing."""
    return EmailToGravatarTransform(sketch_id="test_sketch", scan_id="test_scan")


def test_preprocess_valid_objects(transform):
    """Test preprocess with valid Email objects."""
    inputs = [
        Email(email="test@example.com"),
        Email(email="user@domain.com"),
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Email) for item in result)
    assert result[0].email == "test@example.com"
    assert result[1].email == "user@domain.com"


def test_preprocess_strings(transform):
    """Test preprocess with string inputs (converted via primary field)."""
    inputs = ["test@example.com", "user@domain.com"]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Email) for item in result)
    assert result[0].email == "test@example.com"
    assert result[1].email == "user@domain.com"


def test_preprocess_dicts(transform):
    """Test preprocess with dict inputs."""
    inputs = [
        {"email": "test@example.com"},
        {"email": "user@domain.com"},
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Email) for item in result)
    assert result[0].email == "test@example.com"
    assert result[1].email == "user@domain.com"


def test_preprocess_invalid_filtered(transform):
    """Test that invalid items are filtered out."""
    inputs = [
        Email(email="test@example.com"),
        "not-an-email",  # Invalid
        Email(email="user@domain.com"),
    ]
    result = transform.preprocess(inputs)

    # Only valid items should remain
    assert len(result) == 2
    assert result[0].email == "test@example.com"
    assert result[1].email == "user@domain.com"


def test_preprocess_mixed_formats(transform):
    """Test preprocess with mixed input formats."""
    inputs = [
        Email(email="test@example.com"),  # Object
        "user@domain.com",  # String
        {"email": "admin@site.org"},  # Dict
        {"invalid_key": "wrong@example.com"},  # Invalid dict (wrong key)
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 3  # Should have 3 valid items
    assert all(isinstance(item, Email) for item in result)
    assert result[0].email == "test@example.com"
    assert result[1].email == "user@domain.com"
    assert result[2].email == "admin@site.org"


def test_preprocess_empty_list(transform):
    """Test preprocess with empty input."""
    result = transform.preprocess([])
    assert result == []


def test_preprocess_all_invalid(transform):
    """Test preprocess when all items are invalid."""
    inputs = [
        "not-an-email",
        "missing@",
        "invalid",
    ]
    result = transform.preprocess(inputs)

    assert len(result) == 0
