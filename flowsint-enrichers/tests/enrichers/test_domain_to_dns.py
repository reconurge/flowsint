import pytest

from flowsint_enrichers import ENRICHER_REGISTRY
from flowsint_enrichers.domain.to_dns import DomainToDnsEnricher
from flowsint_types.ip import Ip
from tools.network.dnsx import DnsxTool


# ---------------------------------------------------------------------------
# Registry wiring
# ---------------------------------------------------------------------------
def test_domain_to_dns_is_registered():
    enricher = ENRICHER_REGISTRY.get_enricher("domain_to_dns", "123", "123")
    assert enricher.name() == "domain_to_dns"


def test_domain_to_dns_metadata():
    assert DomainToDnsEnricher.category() == "Domain"
    assert DomainToDnsEnricher.key() == "domain"
    assert DomainToDnsEnricher.input_schema()["type"] == "Domain"
    assert DomainToDnsEnricher.output_schema()["type"] == "Ip"


# ---------------------------------------------------------------------------
# dnsx JSONL parsing (no Docker required)
# ---------------------------------------------------------------------------
def test_parse_resolved_ips_extracts_a_and_aaaa():
    output = (
        '{"host":"example.com","a":["93.184.216.34"],'
        '"aaaa":["2606:2800:220:1:248:1893:25c8:1946"]}'
    )
    assert DnsxTool._parse_resolved_ips(output) == [
        "93.184.216.34",
        "2606:2800:220:1:248:1893:25c8:1946",
    ]


def test_parse_resolved_ips_dedupes_and_preserves_order():
    output = "\n".join(
        [
            '{"host":"a.com","a":["1.1.1.1","1.0.0.1"]}',
            '{"host":"a.com","a":["1.1.1.1"],"aaaa":["2606:4700:4700::1111"]}',
        ]
    )
    assert DnsxTool._parse_resolved_ips(output) == [
        "1.1.1.1",
        "1.0.0.1",
        "2606:4700:4700::1111",
    ]


def test_parse_resolved_ips_skips_blank_and_malformed_lines():
    output = "\n".join(
        [
            "",
            "not-json",
            '{"host":"a.com","a":["8.8.8.8"]}',
            "   ",
        ]
    )
    assert DnsxTool._parse_resolved_ips(output) == ["8.8.8.8"]


def test_parse_resolved_ips_handles_empty_output():
    assert DnsxTool._parse_resolved_ips("") == []
    assert DnsxTool._parse_resolved_ips("   \n  ") == []


# ---------------------------------------------------------------------------
# scan() — dnsx tool mocked, no Docker daemon touched
# ---------------------------------------------------------------------------
class _FakeDnsx:
    def __init__(self, mapping):
        self._mapping = mapping
        self.calls = []

    def resolve_domain(self, domain, aaaa=True, api_key=None):
        self.calls.append((domain, aaaa, api_key))
        return self._mapping.get(domain, [])


@pytest.mark.asyncio
async def test_scan_returns_ip_objects_tagged_with_source_domain(monkeypatch):
    fake = _FakeDnsx({"example.com": ["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"]})
    monkeypatch.setattr(
        "flowsint_enrichers.domain.to_dns.DnsxTool", lambda: fake
    )

    enricher = DomainToDnsEnricher(sketch_id="s", scan_id="t", graph_service=None)
    from flowsint_types.domain import Domain

    results = await enricher.scan([Domain(domain="example.com")])

    assert {ip.address for ip in results} == {
        "93.184.216.34",
        "2606:2800:220:1:248:1893:25c8:1946",
    }
    assert all(isinstance(ip, Ip) for ip in results)
    assert all(getattr(ip, "_source_domain") == "example.com" for ip in results)


@pytest.mark.asyncio
async def test_scan_ipv6_param_disables_aaaa(monkeypatch):
    fake = _FakeDnsx({"example.com": ["93.184.216.34"]})
    monkeypatch.setattr(
        "flowsint_enrichers.domain.to_dns.DnsxTool", lambda: fake
    )

    enricher = DomainToDnsEnricher(
        sketch_id="s", scan_id="t", graph_service=None, params={"ipv6": "false"}
    )
    from flowsint_types.domain import Domain

    await enricher.scan([Domain(domain="example.com")])

    # aaaa flag forwarded to the tool as False
    assert fake.calls == [("example.com", False, None)]


@pytest.mark.asyncio
async def test_scan_skips_unresolvable_domain(monkeypatch):
    fake = _FakeDnsx({})  # no records for anything
    monkeypatch.setattr(
        "flowsint_enrichers.domain.to_dns.DnsxTool", lambda: fake
    )

    enricher = DomainToDnsEnricher(sketch_id="s", scan_id="t", graph_service=None)
    from flowsint_types.domain import Domain

    results = await enricher.scan([Domain(domain="example.com")])
    assert results == []
