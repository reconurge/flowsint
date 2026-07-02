"""Tests for Arabic Twitter (Nitter) enrichers."""

from unittest.mock import MagicMock, patch

import pytest

from flowsint_enrichers.individual.to_arabic_tweets import (
    IndividualToArabicTweetsEnricher,
)
from flowsint_enrichers.phrase.to_arabic_tweets import (
    PhraseToArabicTweetsEnricher,
)
from flowsint_types import Individual, Phrase


FIXTURE_HITS = [
    {
        "url": "https://x.com/someuser/status/123",
        "title": "Arabic tweet about: query",
        "snippet": "Tweet body in Arabic.",
        "via": "https://nitter.privacydev.net",
    },
]


def _make_enricher(cls):
    enricher = cls(sketch_id="s", scan_id="x")
    enricher._graph_service = MagicMock()
    return enricher


@pytest.mark.asyncio
async def test_individual_to_arabic_tweets_scan():
    enricher = _make_enricher(IndividualToArabicTweetsEnricher)
    individual = Individual(first_name="A", last_name="B", full_name="A B")
    with patch(
        "flowsint_enrichers.individual.to_arabic_tweets.NitterArabicTool"
    ) as MockTool:
        MockTool.return_value.launch.return_value = FIXTURE_HITS
        results = await enricher.scan([individual])
    assert len(results) == 1
    assert str(results[0].url) == "https://x.com/someuser/status/123"


@pytest.mark.asyncio
async def test_phrase_to_arabic_tweets_scan():
    enricher = _make_enricher(PhraseToArabicTweetsEnricher)
    phrase = Phrase(text="Saudi Vision")
    with patch(
        "flowsint_enrichers.phrase.to_arabic_tweets.NitterArabicTool"
    ) as MockTool:
        MockTool.return_value.launch.return_value = FIXTURE_HITS
        results = await enricher.scan([phrase])
    assert len(results) == 1


@pytest.mark.asyncio
async def test_arabic_tweets_uses_correct_rel_label():
    enricher = _make_enricher(IndividualToArabicTweetsEnricher)
    individual = Individual(first_name="A", last_name="B", full_name="A B")
    with patch(
        "flowsint_enrichers.individual.to_arabic_tweets.NitterArabicTool"
    ) as MockTool:
        MockTool.return_value.launch.return_value = FIXTURE_HITS
        results = await enricher.scan([individual])
        enricher.postprocess(results, [individual])
    rel_calls = enricher._graph_service.create_relationship.call_args_list
    assert rel_calls and rel_calls[0].kwargs["rel_label"] == "MENTIONED_ON_TWITTER_AR"


def test_enricher_registration():
    from flowsint_enrichers import ENRICHER_REGISTRY

    assert ENRICHER_REGISTRY.enricher_exists("individual_to_arabic_tweets")
    assert ENRICHER_REGISTRY.enricher_exists("phrase_to_arabic_tweets")
