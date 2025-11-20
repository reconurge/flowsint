import pytest
from flowsint_transforms.domain.to_website import DomainToWebsiteTransform
from flowsint_types.domain import Domain
from flowsint_types.website import Website
from pydantic import HttpUrl


@pytest.fixture
def transform():
    """Create transform instance for testing."""
    return DomainToWebsiteTransform(sketch_id="test_sketch", scan_id="test_scan")


def test_website_object_serialization(transform):
    """Test that Website objects with HttpUrl can be properly serialized."""
    # Create a website object with HttpUrl
    domain = Domain(domain="example.com")
    website = Website(
        url=HttpUrl("https://example.com"),
        domain=domain,
        active=True,
        redirects=[HttpUrl("https://www.example.com")]
    )

    # Verify the Website object is created correctly
    assert isinstance(website.url, HttpUrl)
    assert len(website.redirects) == 1
    assert isinstance(website.redirects[0], HttpUrl)

    # Test model_dump with mode="json" properly serializes HttpUrl to strings
    dumped = website.model_dump(mode="json")
    assert isinstance(dumped["url"], str)
    assert dumped["url"] == "https://example.com/"
    assert isinstance(dumped["redirects"][0], str)
    assert dumped["redirects"][0] == "https://www.example.com/"


def test_create_node_with_website(transform):
    """Test that create_node can handle Website objects with HttpUrl fields."""
    domain = Domain(domain="example.com")
    website = Website(
        url=HttpUrl("https://example.com"),
        domain=domain,
        active=True
    )

    # This should not raise an error about unsupported types
    # The create_node method should properly serialize HttpUrl to string
    try:
        transform.create_node(website)
        # If we get here without exception, the serialization works
        success = True
    except Exception as e:
        success = False
        error_msg = str(e)

    # Note: This test won't actually create a node if Neo4j isn't connected,
    # but it will verify the serialization doesn't fail
    assert success or "Neo4j" in error_msg or "connection" in error_msg.lower()


def test_create_relationship_with_website(transform):
    """Test that create_relationship can handle Website objects with HttpUrl fields."""
    domain = Domain(domain="example.com")
    website = Website(
        url=HttpUrl("https://example.com"),
        domain=domain,
        active=True
    )

    # This should not raise an error about unsupported HttpUrl types
    # The create_relationship method should properly serialize HttpUrl to string
    try:
        transform.create_relationship(domain, website, "HAS_WEBSITE")
        # If we get here without exception, the serialization works
        success = True
    except Exception as e:
        success = False
        error_msg = str(e)

    # Note: This test won't actually create a relationship if Neo4j isn't connected,
    # but it will verify the serialization doesn't fail
    assert success or "Neo4j" in error_msg or "connection" in error_msg.lower()


def test_extract_primary_value_with_httpurl(transform):
    """Test that _extract_primary_value properly serializes HttpUrl."""
    website = Website(
        url=HttpUrl("https://example.com"),
        domain=Domain(domain="example.com"),
        active=True
    )

    # Extract the primary value (url field)
    primary_value = transform._extract_primary_value(website)

    # Should be a string, not an HttpUrl object
    assert isinstance(primary_value, str)
    assert primary_value == "https://example.com/"


def test_preprocess_valid_domains(transform):
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
