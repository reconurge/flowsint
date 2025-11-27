import pytest
from flowsint_enrichers.email.to_gravatar import EmailToGravatarEnricher
from flowsint_types.email import Email


@pytest.fixture
def enricher():
    """Create enricher instance for testing."""
    return EmailToGravatarEnricher(sketch_id="test_sketch", scan_id="test_scan")


def test_preprocess_valid_objects(enricher):
    """Test preprocess with valid Email objects."""
    inputs = [
        Email(email="test@example.com"),
        Email(email="user@domain.com"),
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Email) for item in result)
    assert result[0].email == "test@example.com"
    assert result[1].email == "user@domain.com"


def test_preprocess_strings(enricher):
    """Test preprocess with string inputs (converted via primary field)."""
    inputs = ["test@example.com", "user@domain.com"]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Email) for item in result)
    assert result[0].email == "test@example.com"
    assert result[1].email == "user@domain.com"


def test_preprocess_dicts(enricher):
    """Test preprocess with dict inputs."""
    inputs = [
        {"email": "test@example.com"},
        {"email": "user@domain.com"},
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Email) for item in result)
    assert result[0].email == "test@example.com"
    assert result[1].email == "user@domain.com"


def test_preprocess_invalid_filtered(enricher):
    """Test that invalid items are filtered out."""
    inputs = [
        Email(email="test@example.com"),
        "not-an-email",  # Invalid
        Email(email="user@domain.com"),
    ]
    result = enricher.preprocess(inputs)

    # Only valid items should remain
    assert len(result) == 2
    assert result[0].email == "test@example.com"
    assert result[1].email == "user@domain.com"


def test_preprocess_mixed_formats(enricher):
    """Test preprocess with mixed input formats."""
    inputs = [
        Email(email="test@example.com"),  # Object
        "user@domain.com",  # String
        {"email": "admin@site.org"},  # Dict
        {"invalid_key": "wrong@example.com"},  # Invalid dict (wrong key)
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 3  # Should have 3 valid items
    assert all(isinstance(item, Email) for item in result)
    assert result[0].email == "test@example.com"
    assert result[1].email == "user@domain.com"
    assert result[2].email == "admin@site.org"


def test_preprocess_empty_list(enricher):
    """Test preprocess with empty input."""
    result = enricher.preprocess([])
    assert result == []


def test_preprocess_all_invalid(enricher):
    """Test preprocess when all items are invalid."""
    inputs = [
        "not-an-email",
        "missing@",
        "invalid",
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 0
