import pytest
from flowsint_enrichers.website.to_text import WebsiteToText
from flowsint_types.website import Website


@pytest.fixture
def enricher():
    """Create enricher instance for testing."""
    return WebsiteToText(sketch_id="test_sketch", scan_id="test_scan")


def test_preprocess_valid_objects(enricher):
    """Test preprocess with valid Website objects."""
    inputs = [
        Website(url="https://example.com"),
        Website(url="https://google.com"),
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Website) for item in result)
    assert str(result[0].url) == "https://example.com/"
    assert str(result[1].url) == "https://google.com/"


def test_preprocess_strings(enricher):
    """Test preprocess with string inputs (converted via primary field)."""
    inputs = ["https://example.com", "https://google.com"]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Website) for item in result)
    assert str(result[0].url) == "https://example.com/"
    assert str(result[1].url) == "https://google.com/"


def test_preprocess_dicts(enricher):
    """Test preprocess with dict inputs."""
    inputs = [
        {"url": "https://example.com"},
        {"url": "https://google.com"},
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Website) for item in result)
    assert str(result[0].url) == "https://example.com/"
    assert str(result[1].url) == "https://google.com/"


def test_preprocess_invalid_filtered(enricher):
    """Test that invalid items are filtered out."""
    inputs = [
        Website(url="https://example.com"),
        "not-a-url",  # Invalid
        Website(url="https://google.com"),
    ]
    result = enricher.preprocess(inputs)

    # Only valid items should remain
    assert len(result) == 2
    assert str(result[0].url) == "https://example.com/"
    assert str(result[1].url) == "https://google.com/"


def test_preprocess_mixed_formats(enricher):
    """Test preprocess with mixed input formats."""
    inputs = [
        Website(url="https://example.com"),  # Object
        "https://google.com",  # String
        {"url": "https://github.com"},  # Dict
        {"invalid_key": "https://wrong.com"},  # Invalid dict (wrong key)
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 3  # Should have 3 valid items
    assert all(isinstance(item, Website) for item in result)


def test_preprocess_empty_list(enricher):
    """Test preprocess with empty input."""
    result = enricher.preprocess([])
    assert result == []
