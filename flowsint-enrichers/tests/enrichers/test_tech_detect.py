import pytest

from flowsint_enrichers import ENRICHER_REGISTRY
from flowsint_enrichers.website.to_technologies import TechDetectEnricher
from flowsint_types.technology import Technology
from flowsint_types.website import Website


# ---------------------------------------------------------------------------
# Technology type
# ---------------------------------------------------------------------------
def test_technology_label_without_version():
    assert Technology(name="nginx").nodeLabel == "nginx"


def test_technology_label_with_version():
    assert Technology(name="PHP", version="8.1").nodeLabel == "PHP 8.1"


def test_technology_from_string_plain_and_versioned():
    assert Technology.from_string("nginx").version is None
    t = Technology.from_string("PHP:8.1")
    assert (t.name, t.version) == ("PHP", "8.1")


def test_technology_is_in_type_registry():
    from flowsint_types import TYPE_REGISTRY

    assert TYPE_REGISTRY.get_lowercase("technology") is Technology


# ---------------------------------------------------------------------------
# Registry wiring
# ---------------------------------------------------------------------------
def test_tech_detect_is_registered():
    enricher = ENRICHER_REGISTRY.get_enricher("tech_detect", "123", "123")
    assert enricher.name() == "tech_detect"


def test_tech_detect_metadata():
    assert TechDetectEnricher.category() == "Website"
    assert TechDetectEnricher.key() == "website"
    assert TechDetectEnricher.input_schema()["type"] == "Website"
    assert TechDetectEnricher.output_schema()["type"] == "Technology"


# ---------------------------------------------------------------------------
# _parse_tech
# ---------------------------------------------------------------------------
def test_parse_tech_plain():
    t = TechDetectEnricher._parse_tech("nginx")
    assert (t.name, t.version, t.source) == ("nginx", None, "httpx")


def test_parse_tech_versioned():
    t = TechDetectEnricher._parse_tech("PHP:8.1")
    assert (t.name, t.version) == ("PHP", "8.1")


def test_parse_tech_blank_returns_none():
    assert TechDetectEnricher._parse_tech("") is None
    assert TechDetectEnricher._parse_tech("   ") is None
    assert TechDetectEnricher._parse_tech(":1.0") is None


# ---------------------------------------------------------------------------
# scan() — httpx mocked, no Docker daemon touched
# ---------------------------------------------------------------------------
class _FakeHttpx:
    def __init__(self, by_url):
        self._by_url = by_url
        self.calls = []

    def launch(self, target, args=None):
        self.calls.append((target, args))
        return self._by_url.get(target, [])


@pytest.mark.asyncio
async def test_scan_extracts_and_dedupes_technologies(monkeypatch):
    fake = _FakeHttpx(
        {
            "https://example.com/": [
                {"tech": ["nginx", "PHP:8.1", "nginx"]},  # duplicate nginx
            ]
        }
    )
    monkeypatch.setattr(
        "flowsint_enrichers.website.to_technologies.HttpxTool", lambda: fake
    )

    enricher = TechDetectEnricher(sketch_id="s", scan_id="t", graph_service=None)
    results = await enricher.scan([Website(url="https://example.com/")])

    labels = sorted(t.nodeLabel for t in results)
    assert labels == ["PHP 8.1", "nginx"]
    assert all(isinstance(t, Technology) for t in results)
    assert all(getattr(t, "_source_url") == "https://example.com/" for t in results)
    # -td flag forwarded to httpx
    assert fake.calls == [("https://example.com/", ["-td"])]


@pytest.mark.asyncio
async def test_scan_handles_no_tech_field(monkeypatch):
    fake = _FakeHttpx({"https://example.com/": [{"status_code": 200}]})
    monkeypatch.setattr(
        "flowsint_enrichers.website.to_technologies.HttpxTool", lambda: fake
    )

    enricher = TechDetectEnricher(sketch_id="s", scan_id="t", graph_service=None)
    results = await enricher.scan([Website(url="https://example.com/")])
    assert results == []
