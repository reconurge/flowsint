import pytest

from flowsint_enrichers import ENRICHER_REGISTRY
from flowsint_enrichers.domain.to_indexed_pages import (
    PAGE_SIZE,
    DomainToIndexedPagesEnricher,
)
from flowsint_types.domain import Domain
from flowsint_types.website import Website


# ---------------------------------------------------------------------------
# Registry wiring
# ---------------------------------------------------------------------------
def test_domain_to_indexed_pages_is_registered():
    enricher = ENRICHER_REGISTRY.get_enricher("domain_to_indexed_pages", "123", "123")
    assert enricher.name() == "domain_to_indexed_pages"


def test_domain_to_indexed_pages_metadata():
    assert DomainToIndexedPagesEnricher.category() == "Domain"
    assert DomainToIndexedPagesEnricher.key() == "domain"
    assert DomainToIndexedPagesEnricher.input_schema()["type"] == "Domain"
    assert DomainToIndexedPagesEnricher.output_schema()["type"] == "Website"


def test_api_key_is_declared_as_a_required_vault_secret():
    schema = {p["name"]: p for p in DomainToIndexedPagesEnricher.get_params_schema()}
    assert schema["SERPLY_API_KEY"]["type"] == "vaultSecret"
    assert schema["SERPLY_API_KEY"]["required"] is True


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
        "flowsint_enrichers.domain.to_indexed_pages.requests", fake, raising=True
    )
    return DomainToIndexedPagesEnricher(
        sketch_id="s",
        scan_id="t",
        graph_service=None,
        params={"SERPLY_API_KEY": "test-key", **(params or {})},
    )


@pytest.mark.asyncio
async def test_scan_maps_organic_rows_to_websites(monkeypatch):
    fake = _FakeRequests([[_row(1, "https://www.flowsint.io/", "Flowsint", "Graphs")]])
    enricher = _enricher(fake, monkeypatch)

    results = await enricher.scan([Domain(domain="flowsint.io")])

    assert len(results) == 1
    page = results[0]
    assert isinstance(page, Website)
    assert str(page.url) == "https://www.flowsint.io/"
    assert page.title == "Flowsint"
    assert page.description == "Graphs"
    assert page.domain.domain == "flowsint.io"

    # The site: operator and the API key both reach the request.
    assert fake.calls[0]["params"]["q"] == "site:flowsint.io"
    assert fake.calls[0]["headers"]["X-Api-Key"] == "test-key"


@pytest.mark.asyncio
async def test_scan_pages_with_start_and_dedupes_links(monkeypatch):
    first = [_row(1, "https://a.flowsint.io/"), _row(2, "https://b.flowsint.io/")]
    second = [_row(1, "https://a.flowsint.io/"), _row(2, "https://c.flowsint.io/")]
    fake = _FakeRequests([first, second])
    enricher = _enricher(fake, monkeypatch, {"max_results": "4"})

    results = await enricher.scan([Domain(domain="flowsint.io")])

    assert [str(p.url) for p in results] == [
        "https://a.flowsint.io/",
        "https://b.flowsint.io/",
        "https://c.flowsint.io/",
    ]
    # `start` is the only offset the API honours, so it is what advances.
    assert [c["params"]["start"] for c in fake.calls[:2]] == [0, PAGE_SIZE]


@pytest.mark.asyncio
async def test_scan_stops_when_a_window_adds_nothing_new(monkeypatch):
    repeated = [_row(1, "https://a.flowsint.io/")]
    fake = _FakeRequests([repeated] * 10)
    enricher = _enricher(fake, monkeypatch, {"max_results": "50"})

    results = await enricher.scan([Domain(domain="flowsint.io")])

    # One window of duplicates ends the loop instead of refetching forever.
    assert len(results) == 1
    assert len(fake.calls) == 2


@pytest.mark.asyncio
async def test_scan_trims_surplus_rows_to_max_results(monkeypatch):
    rows = [_row(i, f"https://p{i}.flowsint.io/") for i in range(1, 6)]
    fake = _FakeRequests([rows])
    enricher = _enricher(fake, monkeypatch, {"max_results": "2"})

    results = await enricher.scan([Domain(domain="flowsint.io")])
    assert len(results) == 2


@pytest.mark.asyncio
async def test_scan_returns_nothing_on_api_error(monkeypatch):
    fake = _FakeRequests([[]], status_code=403)
    enricher = _enricher(fake, monkeypatch)

    assert await enricher.scan([Domain(domain="flowsint.io")]) == []


@pytest.mark.asyncio
async def test_scan_skips_rows_without_a_usable_link(monkeypatch):
    rows = [_row(1, ""), _row(2, "not-a-url"), _row(3, "https://ok.flowsint.io/")]
    fake = _FakeRequests([rows])
    enricher = _enricher(fake, monkeypatch)

    results = await enricher.scan([Domain(domain="flowsint.io")])
    assert [str(p.url) for p in results] == ["https://ok.flowsint.io/"]


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


def test_postprocess_relates_each_page_back_to_the_domain():
    graph = _FakeGraphService()
    enricher = DomainToIndexedPagesEnricher(
        sketch_id="s", scan_id="t", graph_service=graph
    )
    domain = Domain(domain="flowsint.io")
    page = Website(url="https://www.flowsint.io/docs/overview", domain=domain)

    assert enricher.postprocess([page]) == [page]
    assert graph.nodes == [domain, page]
    assert graph.relationships == [(domain, page, "HAS_WEBSITE")]
