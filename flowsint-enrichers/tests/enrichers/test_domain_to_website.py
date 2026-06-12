import pytest

from flowsint_enrichers import ENRICHER_REGISTRY
from flowsint_enrichers.domain.to_website import DomainToWebsiteEnricher
from flowsint_types.domain import Domain

HTML = """
<html>
  <head>
    <title>Example Domain</title>
    <meta name="description" content="An example site">
    <meta name="generator" content="WordPress 6.0">
  </head>
  <body><div id="root">hello world content here</div></body>
</html>
"""


class _FakeResponse:
    def __init__(self, text=HTML, status_code=200, headers=None):
        self.text = text
        self.status_code = status_code
        self.headers = headers or {
            "content-type": "text/html",
            "server": "nginx",
            "x-powered-by": "PHP/8.1",
        }


def _patch_get(monkeypatch, response):
    def fake_get(url, *args, **kwargs):
        return response

    monkeypatch.setattr(
        "flowsint_enrichers.domain.to_website.requests.get", fake_get
    )


def _enricher(params=None):
    return DomainToWebsiteEnricher(
        sketch_id="s", scan_id="t", graph_service=None, params=params or {}
    )


# ---------------------------------------------------------------------------
# Registry / params schema
# ---------------------------------------------------------------------------
def test_registered():
    assert (
        ENRICHER_REGISTRY.get_enricher("domain_to_website", "1", "1").name()
        == "domain_to_website"
    )


def test_params_schema_exposes_three_toggles():
    names = {p["name"] for p in DomainToWebsiteEnricher.get_params_schema()}
    assert names == {"extract_content", "extract_technologies", "extract_headers"}
    # all default to enabled -> backwards compatible
    assert all(
        p["default"] == "true" for p in DomainToWebsiteEnricher.get_params_schema()
    )


# ---------------------------------------------------------------------------
# Default behavior (all extractions on) — unchanged
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_default_extracts_everything(monkeypatch):
    _patch_get(monkeypatch, _FakeResponse())
    [site] = await _enricher().scan([Domain(domain="example.com")])

    assert site.active is True
    assert site.title == "Example Domain"
    assert site.description == "An example site"
    assert site.content and "hello world" in site.content
    assert "WordPress 6.0" in site.technologies
    assert "React" in site.technologies
    assert site.headers.get("server") == "nginx"


# ---------------------------------------------------------------------------
# Toggles off — heavy extractions skipped, cheap fields still present
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_disable_content(monkeypatch):
    _patch_get(monkeypatch, _FakeResponse())
    [site] = await _enricher({"extract_content": "false"}).scan(
        [Domain(domain="example.com")]
    )
    assert site.content in (None, [], "")  # not populated
    assert site.title == "Example Domain"  # cheap field still there
    assert site.technologies  # still on


@pytest.mark.asyncio
async def test_disable_technologies(monkeypatch):
    _patch_get(monkeypatch, _FakeResponse())
    [site] = await _enricher({"extract_technologies": "false"}).scan(
        [Domain(domain="example.com")]
    )
    assert site.technologies == []
    assert site.content  # still on


@pytest.mark.asyncio
async def test_disable_headers(monkeypatch):
    _patch_get(monkeypatch, _FakeResponse())
    [site] = await _enricher({"extract_headers": "false"}).scan(
        [Domain(domain="example.com")]
    )
    assert site.headers in (None, {})
    assert site.title == "Example Domain"


@pytest.mark.asyncio
async def test_all_heavy_disabled_keeps_core_fields(monkeypatch):
    _patch_get(monkeypatch, _FakeResponse())
    [site] = await _enricher(
        {
            "extract_content": "false",
            "extract_technologies": "false",
            "extract_headers": "false",
        }
    ).scan([Domain(domain="example.com")])

    assert site.active is True
    assert site.status_code == 200
    assert site.title == "Example Domain"
    assert site.description == "An example site"
    assert not site.content
    assert site.technologies == []
    assert not site.headers


@pytest.mark.asyncio
async def test_inactive_when_request_fails(monkeypatch):
    import requests as _requests

    def boom(*a, **k):
        raise _requests.RequestException("no network")

    monkeypatch.setattr(
        "flowsint_enrichers.domain.to_website.requests.get", boom
    )
    [site] = await _enricher().scan([Domain(domain="example.com")])
    assert site.active is False
    assert str(site.url).startswith("https://example.com")
