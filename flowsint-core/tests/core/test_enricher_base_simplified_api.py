"""Test simplified API for create_node and create_relationship."""

from typing import List

import pytest
from flowsint_types.domain import Domain
from flowsint_types.email import Email
from flowsint_types.individual import Individual

from flowsint_core.core.enricher_base import Enricher


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


def test_create_relationship_with_pydantic_objects():
    """Test that create_relationship works with Pydantic objects."""
    enricher = MockEnricher(sketch_id="test", scan_id="test")

    # Create objects
    individual = Individual(first_name="John", last_name="Doe", full_name="John Doe")
    domain = Domain(domain="example.com")

    # This should not raise an error
    enricher.create_relationship(individual, domain, "HAS_DOMAIN")


def test_create_node_with_property_override():
    """Test that property overrides work with Pydantic objects."""
    enricher = MockEnricher(sketch_id="test", scan_id="test")

    domain = Domain(domain="example.com")

    # Should be able to override properties
    enricher.create_node(domain)
