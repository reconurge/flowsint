import pytest
from flowsint_enrichers.phone.to_infos import IgnorantEnricher
from flowsint_types.phone import Phone


@pytest.fixture
def enricher():
    """Create enricher instance for testing."""
    return IgnorantEnricher(sketch_id="test_sketch", scan_id="test_scan")


def test_preprocess_valid_objects(enricher):
    """Test preprocess with valid Phone objects."""
    inputs = [
        Phone(number="+33612345678"),
        Phone(number="+14155552671"),
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Phone) for item in result)
    assert result[0].number == "+33612345678"
    assert result[1].number == "+14155552671"


def test_preprocess_strings(enricher):
    """Test preprocess with string inputs (converted via primary field)."""
    inputs = ["+33612345678", "+14155552671"]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Phone) for item in result)
    assert result[0].number == "+33612345678"
    assert result[1].number == "+14155552671"


def test_preprocess_dicts(enricher):
    """Test preprocess with dict inputs."""
    inputs = [
        {"number": "+33612345678"},
        {"number": "+14155552671"},
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Phone) for item in result)
    assert result[0].number == "+33612345678"
    assert result[1].number == "+14155552671"


def test_preprocess_invalid_filtered(enricher):
    """Test that invalid items are filtered out."""
    inputs = [
        Phone(number="+33612345678"),
        "123",  # Invalid (too short)
        Phone(number="+14155552671"),
    ]
    result = enricher.preprocess(inputs)

    # Only valid items should remain
    assert len(result) == 2
    assert result[0].number == "+33612345678"
    assert result[1].number == "+14155552671"


def test_preprocess_mixed_formats(enricher):
    """Test preprocess with mixed input formats."""
    inputs = [
        Phone(number="+33612345678"),  # Object
        "+14155552671",  # String
        {"number": "+447911123456"},  # Dict
        {"invalid_key": "+15555555555"},  # Invalid dict (wrong key)
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 3  # Should have 3 valid items
    assert all(isinstance(item, Phone) for item in result)


def test_preprocess_empty_list(enricher):
    """Test preprocess with empty input."""
    result = enricher.preprocess([])
    assert result == []


def test_preprocess_all_invalid(enricher):
    """Test preprocess when all items are invalid."""
    inputs = [
        "123",
        "not-a-phone",
        "",
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 0
