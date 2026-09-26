"""Tests for Argaam enrichers (Individual and Phrase variants)."""

from unittest.mock import MagicMock, patch

import pytest

from flowsint_enrichers.individual.to_argaam import IndividualToArgaamEnricher
from flowsint_enrichers.phrase.to_argaam import PhraseToArgaamEnricher
from flowsint_types import Individual, Phrase


FIXTURE_HITS = [
    {
        "url": "https://www.argaam.com/ar/article/articledetail/id/1234567",
        "title": "تقرير مالي",
        "snippet": "ملخص التقرير.",
        "date": "2026-05-30",
    },
]


def _make_enricher(cls):
    enricher = cls(sketch_id="s", scan_id="x")
    enricher._graph_service = MagicMock()
    return enricher


@pytest.mark.asyncio
async def test_individual_to_argaam_scan_returns_websites():
    enricher = _make_enricher(IndividualToArgaamEnricher)
    individual = Individual(
        first_name="X", last_name="Y", full_name="X Y"
    )
    with patch(
        "flowsint_enrichers.individual.to_argaam.ArgaamTool"
    ) as MockTool:
        MockTool.return_value.launch.return_value = FIXTURE_HITS
        results = await enricher.scan([individual])
    assert len(results) == 1
    assert results[0].title == "تقرير مالي"


@pytest.mark.asyncio
async def test_phrase_to_argaam_scan_returns_websites():
    enricher = _make_enricher(PhraseToArgaamEnricher)
    phrase = Phrase(text="السوق المالية")
    with patch(
        "flowsint_enrichers.phrase.to_argaam.ArgaamTool"
    ) as MockTool:
        MockTool.return_value.launch.return_value = FIXTURE_HITS
        results = await enricher.scan([phrase])
    assert len(results) == 1


@pytest.mark.asyncio
async def test_individual_to_argaam_uses_correct_rel_label():
    enricher = _make_enricher(IndividualToArgaamEnricher)
    individual = Individual(first_name="X", last_name="Y", full_name="X Y")
    with patch(
        "flowsint_enrichers.individual.to_argaam.ArgaamTool"
    ) as MockTool:
        MockTool.return_value.launch.return_value = FIXTURE_HITS
        results = await enricher.scan([individual])
        enricher.postprocess(results, [individual])
    rel_calls = enricher._graph_service.create_relationship.call_args_list
    assert rel_calls and rel_calls[0].kwargs["rel_label"] == "MENTIONED_IN_ARGAAM"


def test_enricher_registration():
    from flowsint_enrichers import ENRICHER_REGISTRY

    assert ENRICHER_REGISTRY.enricher_exists("individual_to_argaam")
    assert ENRICHER_REGISTRY.enricher_exists("phrase_to_argaam")
