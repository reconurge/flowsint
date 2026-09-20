import pytest

from flowsint_enrichers import ENRICHER_REGISTRY
from flowsint_enrichers.individual.to_mentions import (
    PAGE_SIZE,
    IndividualToMentionsEnricher,
)
from flowsint_types.individual import Individual
from flowsint_types.website import Website


# ---------------------------------------------------------------------------
# Registry wiring
# ---------------------------------------------------------------------------
def test_individual_to_mentions_is_registered():
    enricher = ENRICHER_REGISTRY.get_enricher("individual_to_mentions", "123", "123")
    assert enricher.name() == "individual_to_mentions"


def test_individual_to_mentions_metadata():
    assert IndividualToMentionsEnricher.category() == "Individual"
    assert IndividualToMentionsEnricher.key() == "full_name"
    assert IndividualToMentionsEnricher.input_schema()["type"] == "Individual"
    assert IndividualToMentionsEnricher.output_schema()["type"] == "Website"


def test_api_key_is_declared_as_a_required_vault_secret():
    schema = {p["name"]: p for p in IndividualToMentionsEnricher.get_params_schema()}
    assert schema["SERPLY_API_KEY"]["type"] == "vaultSecret"
    assert schema["SERPLY_API_KEY"]["required"] is True
    assert schema["additional_terms"]["required"] is False


def test_enricher_declares_that_it_requires_params():
    assert IndividualToMentionsEnricher.required_params() is True


# ---------------------------------------------------------------------------
# scan() - HTTP layer mocked, no API key and no network needed
# ---------------------------------------------------------------------------
class _FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.text = str(payload)

    def json(self):
        return self._payload


class _FakeRequests:
    """Stands in for the `requests` module inside the enricher."""

    def __init__(self, windows, status_code=200):
        self._windows = windows
        self._status_code = status_code
        self.calls = []

    def get(self, url, params=None, headers=None, timeout=None):
        self.calls.append({"url": url, "params": params, "headers": headers})
        index = len(self.calls) - 1
        rows = self._windows[index] if index < len(self._windows) else []
        return _FakeResponse({"results": rows}, self._status_code)


def _row(position, link, title="Title", description="Description"):
    return {
        "position": position,
        "title": title,
        "link": link,
        "description": description,
    }


def _enricher(fake, monkeypatch, params=None):
    monkeypatch.setattr(
        "flowsint_enrichers.individual.to_mentions.requests", fake, raising=True
    )
    return IndividualToMentionsEnricher(
        sketch_id="s",
        scan_id="t",
        graph_service=None,
        params={"SERPLY_API_KEY": "test-key", **(params or {})},
    )


@pytest.mark.asyncio
async def test_scan_maps_organic_rows_to_websites(monkeypatch):
    fake = _FakeRequests(
        [[_row(1, "https://en.wikipedia.org/wiki/Jane_Doe", "Jane Doe", "Bio")]]
    )
    enricher = _enricher(fake, monkeypatch)

    results = await enricher.scan([Individual(full_name="Jane Doe")])

    assert len(results) == 1
    mention = results[0]
    assert isinstance(mention, Website)
    assert str(mention.url) == "https://en.wikipedia.org/wiki/Jane_Doe"
    assert mention.title == "Jane Doe"
    assert mention.description == "Bio"

    # The name is quoted so the index matches the phrase, not the loose words.
    assert fake.calls[0]["params"]["q"] == '"Jane Doe"'
    assert fake.calls[0]["headers"]["X-Api-Key"] == "test-key"


@pytest.mark.asyncio
async def test_additional_terms_narrow_the_query(monkeypatch):
    fake = _FakeRequests([[_row(1, "https://example.com/jane")]])
    enricher = _enricher(fake, monkeypatch, {"additional_terms": " Acme Corp "})

    await enricher.scan([Individual(full_name="Jane Doe")])

    assert fake.calls[0]["params"]["q"] == '"Jane Doe" Acme Corp'


@pytest.mark.asyncio
async def test_scan_skips_an_individual_without_a_name(monkeypatch):
    fake = _FakeRequests([[_row(1, "https://example.com/jane")]])
    enricher = _enricher(fake, monkeypatch)

    # An Individual can reach an enricher with no name at all, for instance one
    # pivoted from an email. Nothing to search on, so no credit is spent.
    nameless = Individual(age=30)
    assert nameless.full_name is None
    assert await enricher.scan([nameless]) == []
    assert fake.calls == []


@pytest.mark.asyncio
async def test_scan_uses_the_name_compute_label_backfilled(monkeypatch):
    fake = _FakeRequests([[_row(1, "https://example.com/jane")]])
    enricher = _enricher(fake, monkeypatch)

    # Individual.compute_label fills full_name in from the parts, so an
    # individual carrying only first/last is still searchable.
    await enricher.scan([Individual(first_name="Jane", last_name="Doe")])

    assert fake.calls[0]["params"]["q"] == '"Jane Doe"'


@pytest.mark.asyncio
async def test_scan_pages_with_start_and_dedupes_links(monkeypatch):
    first = [_row(1, "https://a.example.com/"), _row(2, "https://b.example.com/")]
    second = [_row(1, "https://a.example.com/"), _row(2, "https://c.example.com/")]
    fake = _FakeRequests([first, second])
    enricher = _enricher(fake, monkeypatch, {"max_results": "4"})

    results = await enricher.scan([Individual(full_name="Jane Doe")])

    assert [str(m.url) for m in results] == [
        "https://a.example.com/",
        "https://b.example.com/",
        "https://c.example.com/",
    ]
    # `start` is the only offset the API honours, so it is what advances.
    assert [c["params"]["start"] for c in fake.calls[:2]] == [0, PAGE_SIZE]


@pytest.mark.asyncio
async def test_scan_stops_when_a_window_adds_nothing_new(monkeypatch):
    repeated = [_row(1, "https://a.example.com/")]
    fake = _FakeRequests([repeated] * 10)
    enricher = _enricher(fake, monkeypatch, {"max_results": "50"})

    results = await enricher.scan([Individual(full_name="Jane Doe")])

    # One window of duplicates ends the loop instead of refetching forever.
    assert len(results) == 1
    assert len(fake.calls) == 2


@pytest.mark.asyncio
async def test_scan_trims_surplus_rows_to_max_results(monkeypatch):
    rows = [_row(i, f"https://p{i}.example.com/") for i in range(1, 6)]
    fake = _FakeRequests([rows])
    enricher = _enricher(fake, monkeypatch, {"max_results": "2"})

    results = await enricher.scan([Individual(full_name="Jane Doe")])
    assert len(results) == 2


@pytest.mark.asyncio
async def test_scan_returns_nothing_on_api_error(monkeypatch):
    fake = _FakeRequests([[]], status_code=403)
    enricher = _enricher(fake, monkeypatch)

    assert await enricher.scan([Individual(full_name="Jane Doe")]) == []


@pytest.mark.asyncio
async def test_scan_skips_rows_without_a_usable_link(monkeypatch):
    rows = [_row(1, ""), _row(2, "not-a-url"), _row(3, "https://ok.example.com/")]
    fake = _FakeRequests([rows])
    enricher = _enricher(fake, monkeypatch)

    results = await enricher.scan([Individual(full_name="Jane Doe")])
    assert [str(m.url) for m in results] == ["https://ok.example.com/"]


# ---------------------------------------------------------------------------
# postprocess() - graph service mocked
# ---------------------------------------------------------------------------
class _FakeGraphService:
    def __init__(self):
        self.nodes = []
        self.relationships = []
        self.messages = []

    def create_node_from_flowsint_type(self, node_obj):
        self.nodes.append(node_obj)

    def create_relationship(self, from_obj, to_obj, rel_label):
        self.relationships.append((from_obj, to_obj, rel_label))

    def log_graph_message(self, message):
        self.messages.append(message)


def _mention(url, full_name="Jane Doe"):
    mention = Website(url=url)
    setattr(mention, "_source_full_name", full_name)
    return mention


def test_postprocess_relates_each_mention_back_to_the_individual():
    graph = _FakeGraphService()
    enricher = IndividualToMentionsEnricher(
        sketch_id="s", scan_id="t", graph_service=graph
    )
    mention = _mention("https://en.wikipedia.org/wiki/Jane_Doe")

    assert enricher.postprocess([mention]) == [mention]
    individual = Individual(full_name="Jane Doe")
    assert graph.nodes == [individual, mention]
    assert graph.relationships == [(individual, mention, "MENTIONED_IN")]
    # The attribute used to thread context does not leak onto the node.
    assert not hasattr(mention, "_source_full_name")


def test_postprocess_keeps_each_mention_with_its_own_individual():
    graph = _FakeGraphService()
    enricher = IndividualToMentionsEnricher(
        sketch_id="s", scan_id="t", graph_service=graph
    )
    first = _mention("https://example.com/jane", "Jane Doe")
    second = _mention("https://example.com/john", "John Roe")

    enricher.postprocess([first, second])

    assert [(rel[0].full_name, str(rel[1].url)) for rel in graph.relationships] == [
        ("Jane Doe", "https://example.com/jane"),
        ("John Roe", "https://example.com/john"),
    ]
