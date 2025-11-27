import pytest
from flowsint_enrichers.organization.to_asn import OrgToAsnEnricher
from flowsint_types.organization import Organization


@pytest.fixture
def enricher():
    """Create enricher instance for testing."""
    return OrgToAsnEnricher(sketch_id="test_sketch", scan_id="test_scan")


def test_preprocess_valid_objects(enricher):
    """Test preprocess with valid Organization objects."""
    inputs = [
        Organization(name="Acme Corp"),
        Organization(name="Google LLC"),
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Organization) for item in result)
    assert result[0].name == "Acme Corp"
    assert result[1].name == "Google LLC"


def test_preprocess_strings(enricher):
    """Test preprocess with string inputs (converted via primary field)."""
    inputs = ["Acme Corp", "Google LLC"]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Organization) for item in result)
    assert result[0].name == "Acme Corp"
    assert result[1].name == "Google LLC"


def test_preprocess_dicts(enricher):
    """Test preprocess with dict inputs."""
    inputs = [
        {"name": "Acme Corp"},
        {"name": "Google LLC"},
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Organization) for item in result)
    assert result[0].name == "Acme Corp"
    assert result[1].name == "Google LLC"


def test_preprocess_mixed_formats(enricher):
    """Test preprocess with mixed input formats."""
    inputs = [
        Organization(name="Acme Corp"),  # Object
        "Google LLC",  # String
        {"name": "Microsoft Corporation"},  # Dict
        {"invalid_key": "Apple Inc"},  # Invalid dict (wrong key)
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 3  # Should have 3 valid items
    assert all(isinstance(item, Organization) for item in result)
    assert result[0].name == "Acme Corp"
    assert result[1].name == "Google LLC"
    assert result[2].name == "Microsoft Corporation"


def test_preprocess_empty_list(enricher):
    """Test preprocess with empty input."""
    result = enricher.preprocess([])
    assert result == []


def test_preprocess_with_additional_fields(enricher):
    """Test preprocess with dicts containing additional fields."""
    inputs = [
        {"name": "Acme Corp", "nom_complet": "Acme Corporation"},
        {"name": "Google LLC", "siren": "123456789"},
    ]
    result = enricher.preprocess(inputs)

    assert len(result) == 2
    assert all(isinstance(item, Organization) for item in result)
    assert result[0].name == "Acme Corp"
    assert result[0].nom_complet == "Acme Corporation"
    assert result[1].name == "Google LLC"
    assert result[1].siren == "123456789"
