import pytest

from flowsint_enrichers import ENRICHER_REGISTRY
from flowsint_enrichers.organization.to_news import (
    PAGE_SIZE,
    OrgToNewsEnricher,
)
from flowsint_types.organization import Organization
from flowsint_types.website import Website


# ---------------------------------------------------------------------------
# Registry wiring
# ---------------------------------------------------------------------------
def test_org_to_news_is_registered():
    enricher = ENRICHER_REGISTRY.get_enricher("org_to_news", "123", "123")
    assert enricher.name() == "org_to_news"


def test_org_to_news_metadata():
    assert OrgToNewsEnricher.category() == "Organization"
    assert OrgToNewsEnricher.key() == "name"
    assert OrgToNewsEnricher.input_schema()["type"] == "Organization"
    assert OrgToNewsEnricher.output_schema()["type"] == "Website"


def test_api_key_is_declared_as_a_required_vault_secret():
    schema = {p["name"]: p for p in OrgToNewsEnricher.get_params_schema()}
    assert schema["SERPLY_API_KEY"]["type"] == "vaultSecret"
    assert schema["SERPLY_API_KEY"]["required"] is True
    assert schema["time_range"]["required"] is False
    assert [o["value"] for o in schema["time_range"]["options"]] == [
        "any",
        "d",
        "w",
        "m",
        "y",
    ]


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
        "flowsint_enrichers.organization.to_news.requests", fake, raising=True
    )
    return OrgToNewsEnricher(
        sketch_id="s",
        scan_id="t",
        graph_service=None,
        params={"SERPLY_API_KEY": "test-key", **(params or {})},
    )


@pytest.mark.asyncio
async def test_scan_maps_articles_to_websites(monkeypatch):
    fake = _FakeRequests(
        [[_row(1, "https://news.example.com/acme-raises", "Acme raises", "Snippet")]]
    )
    enricher = _enricher(fake, monkeypatch)

    results = await enricher.scan([Organization(name="Acme Corp")])

    assert len(results) == 1
    article = results[0]
    assert isinstance(article, Website)
    assert str(article.url) == "https://news.example.com/acme-raises"
    assert article.title == "Acme raises"
    assert article.description == "Snippet"

    params = fake.calls[0]["params"]
    # Quoting keeps a multi-word name together instead of matching both words
    # anywhere on the page.
    assert params["q"] == '"Acme Corp"'
    # The news vertical is selected with Google's own `tbm`.
    assert params["tbm"] == "nws"
    assert fake.calls[0]["headers"]["X-Api-Key"] == "test-key"


@pytest.mark.asyncio
async def test_language_and_region_are_pinned_by_default(monkeypatch):
    fake = _FakeRequests([[_row(1, "https://news.example.com/a")]])
    enricher = _enricher(fake, monkeypatch)

    await enricher.scan([Organization(name="Acme Corp")])

    # Left unset these are inferred from where the call originates, which for a
    # server answers an English query with articles in another language.
    assert fake.calls[0]["params"]["hl"] == "en"
    assert fake.calls[0]["params"]["gl"] == "us"


@pytest.mark.asyncio
async def test_language_and_region_are_overridable(monkeypatch):
    fake = _FakeRequests([[_row(1, "https://news.example.com/a")]])
    enricher = _enricher(fake, monkeypatch, {"language": "fr", "region": "fr"})

    await enricher.scan([Organization(name="Acme Corp")])

    assert fake.calls[0]["params"]["hl"] == "fr"
    assert fake.calls[0]["params"]["gl"] == "fr"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "time_range,expected",
    [("d", "qdr:d"), ("w", "qdr:w"), ("m", "qdr:m"), ("y", "qdr:y")],
)
async def test_time_range_maps_onto_the_recency_filter(
    monkeypatch, time_range, expected
):
    fake = _FakeRequests([[_row(1, "https://news.example.com/a")]])
    enricher = _enricher(fake, monkeypatch, {"time_range": time_range})

    await enricher.scan([Organization(name="Acme Corp")])

    assert fake.calls[0]["params"]["tbs"] == expected


@pytest.mark.asyncio
@pytest.mark.parametrize("time_range", ["any", "", "since-tuesday"])
async def test_unfiltered_time_ranges_send_no_recency_filter(monkeypatch, time_range):
    fake = _FakeRequests([[_row(1, "https://news.example.com/a")]])
    enricher = _enricher(fake, monkeypatch, {"time_range": time_range})

    await enricher.scan([Organization(name="Acme Corp")])

    # An unrecognised value searches all of time rather than failing the scan.
    assert "tbs" not in fake.calls[0]["params"]


@pytest.mark.asyncio
@pytest.mark.parametrize("name", ["", "   ", None])
async def test_scan_skips_an_organization_without_a_name(monkeypatch, name):
    fake = _FakeRequests([[_row(1, "https://news.example.com/a")]])
    enricher = _enricher(fake, monkeypatch)

    # `Organization.name` is typed Any, so it can arrive empty or unset from an
    # upstream pivot. Nothing to search on, so no credit is spent.
    assert await enricher.scan([Organization(name=name)]) == []
    assert fake.calls == []


@pytest.mark.asyncio
async def test_scan_pages_with_start_and_dedupes_links(monkeypatch):
    first = [_row(1, "https://a.example.com/"), _row(2, "https://b.example.com/")]
    second = [_row(1, "https://a.example.com/"), _row(2, "https://c.example.com/")]
    fake = _FakeRequests([first, second])
    enricher = _enricher(fake, monkeypatch, {"max_results": "4"})

    results = await enricher.scan([Organization(name="Acme Corp")])

    assert [str(a.url) for a in results] == [
        "https://a.example.com/",
        "https://b.example.com/",
        "https://c.example.com/",
    ]
    # `start` is the only offset the API honours, so it is what advances.
    assert [c["params"]["start"] for c in fake.calls[:2]] == [0, PAGE_SIZE]
    # Every window stays on the news vertical, not just the first.
    assert all(c["params"]["tbm"] == "nws" for c in fake.calls)


@pytest.mark.asyncio
async def test_scan_stops_when_a_window_adds_nothing_new(monkeypatch):
    repeated = [_row(1, "https://a.example.com/")]
    fake = _FakeRequests([repeated] * 10)
    enricher = _enricher(fake, monkeypatch, {"max_results": "50"})

    results = await enricher.scan([Organization(name="Acme Corp")])

    # One window of duplicates ends the loop instead of refetching forever.
    assert len(results) == 1
    assert len(fake.calls) == 2


@pytest.mark.asyncio
async def test_scan_trims_surplus_rows_to_max_results(monkeypatch):
    rows = [_row(i, f"https://p{i}.example.com/") for i in range(1, 6)]
    fake = _FakeRequests([rows])
    enricher = _enricher(fake, monkeypatch, {"max_results": "2"})

    results = await enricher.scan([Organization(name="Acme Corp")])
    assert len(results) == 2


@pytest.mark.asyncio
async def test_scan_returns_nothing_on_api_error(monkeypatch):
    fake = _FakeRequests([[]], status_code=403)
    enricher = _enricher(fake, monkeypatch)

    assert await enricher.scan([Organization(name="Acme Corp")]) == []


@pytest.mark.asyncio
async def test_scan_skips_rows_without_a_usable_link(monkeypatch):
    rows = [_row(1, ""), _row(2, "not-a-url"), _row(3, "https://ok.example.com/")]
    fake = _FakeRequests([rows])
    enricher = _enricher(fake, monkeypatch)

    results = await enricher.scan([Organization(name="Acme Corp")])
    assert [str(a.url) for a in results] == ["https://ok.example.com/"]


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


def _article(url, org_name="Acme Corp"):
    article = Website(url=url)
    setattr(article, "_source_org_name", org_name)
    return article


def test_postprocess_relates_each_article_back_to_the_organization():
    graph = _FakeGraphService()
    enricher = OrgToNewsEnricher(sketch_id="s", scan_id="t", graph_service=graph)
    article = _article("https://news.example.com/acme-raises")

    assert enricher.postprocess([article]) == [article]
    org = Organization(name="Acme Corp")
    assert graph.nodes == [org, article]
    # Coverage is a mention, not a site the organization owns, so this is not
    # the HAS_WEBSITE edge domain_to_website writes.
    assert graph.relationships == [(org, article, "MENTIONED_IN")]
    # The attribute used to thread context does not leak onto the node.
    assert not hasattr(article, "_source_org_name")


def test_postprocess_keeps_each_article_with_its_own_organization():
    graph = _FakeGraphService()
    enricher = OrgToNewsEnricher(sketch_id="s", scan_id="t", graph_service=graph)
    first = _article("https://news.example.com/acme", "Acme Corp")
    second = _article("https://news.example.com/globex", "Globex")

    enricher.postprocess([first, second])

    assert [(rel[0].name, str(rel[1].url)) for rel in graph.relationships] == [
        ("Acme Corp", "https://news.example.com/acme"),
        ("Globex", "https://news.example.com/globex"),
    ]
