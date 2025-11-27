"""Test simplified API for create_node and create_relationship."""
import pytest
from flowsint_core.core.enricher_base import Enricher
from flowsint_types.domain import Domain
from flowsint_types.email import Email
from flowsint_types.individual import Individual
from typing import List


class MockEnricher(Enricher):
    """Simple enricher for testing."""

    InputType = Domain
    OutputType = Domain

    @classmethod
    def name(cls) -> str:
        return "test_enricher"

    @classmethod
    def category(cls) -> str:
        return "Test"

    @classmethod
    def key(cls) -> str:
        return "domain"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        return data


def test_create_node_with_pydantic_object():
    """Test that create_node works with Pydantic objects."""
    enricher = MockEnricher(sketch_id="test", scan_id="test")

    # Create a domain object
    domain = Domain(domain="example.com")

    # This should not raise an error
    enricher.create_node(domain)

    # Verify the helper method works
    primary_field = enricher._get_primary_field(domain)
    assert primary_field == "domain"


def test_create_relationship_with_pydantic_objects():
    """Test that create_relationship works with Pydantic objects."""
    enricher = MockEnricher(sketch_id="test", scan_id="test")

    # Create objects
    individual = Individual(
        first_name="John",
        last_name="Doe",
        full_name="John Doe"
    )
    domain = Domain(domain="example.com")

    # This should not raise an error
    enricher.create_relationship(individual, domain, "HAS_DOMAIN")


def test_create_node_legacy_signature():
    """Test that legacy create_node signature still works."""
    enricher = MockEnricher(sketch_id="test", scan_id="test")

    domain = Domain(domain="example.com")

    # Legacy signature should still work
    enricher.create_node("domain", "domain", "example.com", **domain.__dict__)


def test_create_relationship_legacy_signature():
    """Test that legacy create_relationship signature still works."""
    enricher = MockEnricher(sketch_id="test", scan_id="test")

    # Legacy signature should still work
    enricher.create_relationship(
        "individual",
        "full_name",
        "John Doe",
        "domain",
        "domain",
        "example.com",
        "HAS_DOMAIN"
    )


def test_get_primary_field():
    """Test the _get_primary_field helper method."""
    enricher = MockEnricher(sketch_id="test", scan_id="test")

    # Test with Domain (has primary field marked)
    domain = Domain(domain="example.com")
    assert enricher._get_primary_field(domain) == "domain"

    # Test with Email (has primary field marked)
    email = Email(email="test@example.com")
    assert enricher._get_primary_field(email) == "email"

    # Test with Individual (no primary field marked, falls back to first required field)
    individual = Individual(
        first_name="John",
        last_name="Doe",
        full_name="John Doe"
    )
    assert enricher._get_primary_field(individual) == "full_name"


def test_create_node_with_property_override():
    """Test that property overrides work with Pydantic objects."""
    enricher = MockEnricher(sketch_id="test", scan_id="test")

    domain = Domain(domain="example.com")

    # Should be able to override properties
    enricher.create_node(domain, type="subdomain")
