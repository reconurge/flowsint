"""Tests for Sabq enrichers (Individual and Phrase variants)."""

from unittest.mock import MagicMock, patch

import pytest

from flowsint_enrichers.individual.to_sabq import IndividualToSabqEnricher
from flowsint_enrichers.phrase.to_sabq import PhraseToSabqEnricher
from flowsint_types import Individual, Phrase


FIXTURE_HITS = [
    {
        "url": "https://sabq.org/news/123",
        "title": "خبر تجريبي",
        "snippet": "مقتطف نصي تجريبي للتحقق.",
    },
    {
        "url": "https://sabq.org/news/456",
        "title": "Second Article",
        "snippet": "Second snippet.",
    },
]


def _make_enricher(cls):
    enricher = cls(sketch_id="s", scan_id="x")
    enricher._graph_service = MagicMock()
    return enricher


@pytest.mark.asyncio
async def test_individual_to_sabq_scan_returns_websites():
    enricher = _make_enricher(IndividualToSabqEnricher)
    individual = Individual(
        first_name="Faisal", last_name="Aldeghaither", full_name="Faisal Aldeghaither"
    )

    with patch(
        "flowsint_enrichers.individual.to_sabq.SabqTool"
    ) as MockTool:
        MockTool.return_value.launch.return_value = FIXTURE_HITS
        results = await enricher.scan([individual])

    assert len(results) == 2
    assert str(results[0].url) == "https://sabq.org/news/123"
    assert results[0].title == "خبر تجريبي"
    assert results[0].description == "مقتطف نصي تجريبي للتحقق."


@pytest.mark.asyncio
async def test_individual_to_sabq_handles_tool_exception():
    enricher = _make_enricher(IndividualToSabqEnricher)
    individual = Individual(
        first_name="A", last_name="B", full_name="A B"
    )
    with patch(
        "flowsint_enrichers.individual.to_sabq.SabqTool"
    ) as MockTool:
        MockTool.return_value.launch.side_effect = RuntimeError("boom")
        results = await enricher.scan([individual])
    assert results == []


@pytest.mark.asyncio
async def test_individual_to_sabq_postprocess_creates_nodes_and_edges():
    enricher = _make_enricher(IndividualToSabqEnricher)
    individual = Individual(
        first_name="A", last_name="B", full_name="A B"
    )
    with patch(
        "flowsint_enrichers.individual.to_sabq.SabqTool"
    ) as MockTool:
        MockTool.return_value.launch.return_value = FIXTURE_HITS
        results = await enricher.scan([individual])
        enricher.postprocess(results, [individual])

    gs = enricher._graph_service
    # 1 individual + 2 websites = 3 nodes
    assert gs.create_node_from_flowsint_type.call_count == 3
    # 2 relationships
    rel_calls = gs.create_relationship.call_args_list
    assert len(rel_calls) == 2
    for call in rel_calls:
        assert call.kwargs["rel_label"] == "MENTIONED_IN_SABQ"


@pytest.mark.asyncio
async def test_individual_to_sabq_postprocess_dedupes_urls():
    enricher = _make_enricher(IndividualToSabqEnricher)
    individual = Individual(first_name="A", last_name="B", full_name="A B")
    dup = FIXTURE_HITS + [FIXTURE_HITS[0]]
    with patch(
        "flowsint_enrichers.individual.to_sabq.SabqTool"
    ) as MockTool:
        MockTool.return_value.launch.return_value = dup
        results = await enricher.scan([individual])
        enricher.postprocess(results, [individual])

    # Still only 2 unique relationships
    assert enricher._graph_service.create_relationship.call_count == 2


@pytest.mark.asyncio
async def test_phrase_to_sabq_scan_returns_websites():
    enricher = _make_enricher(PhraseToSabqEnricher)
    phrase = Phrase(text="رؤية 2030")

    with patch(
        "flowsint_enrichers.phrase.to_sabq.SabqTool"
    ) as MockTool:
        MockTool.return_value.launch.return_value = FIXTURE_HITS
        results = await enricher.scan([phrase])

    assert len(results) == 2
    assert str(results[1].url) == "https://sabq.org/news/456"


@pytest.mark.asyncio
async def test_phrase_to_sabq_preprocess_accepts_string_inputs():
    enricher = _make_enricher(PhraseToSabqEnricher)
    cleaned = enricher.preprocess(["رؤية 2030", "  ", "Saudi Vision"])
    assert len(cleaned) == 2
    assert cleaned[0].text == "رؤية 2030"
    assert cleaned[1].text == "Saudi Vision"


def test_enricher_registration():
    """Confirm both enrichers are registered in the global registry."""
    from flowsint_enrichers import ENRICHER_REGISTRY

    assert ENRICHER_REGISTRY.enricher_exists("individual_to_sabq")
    assert ENRICHER_REGISTRY.enricher_exists("phrase_to_sabq")
