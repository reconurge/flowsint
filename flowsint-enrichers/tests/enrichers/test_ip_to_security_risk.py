"""
Tests for the ip_to_security_risk enricher.

Coverage:
- Pure scoring helpers (_compute_risk_score, _risk_level)
- _build_risk_profile: various Shodan response shapes
- scan(): happy path, missing API key, Shodan errors
- postprocess(): graph node/relationship creation
- Vault integration: SHODAN_API_KEY resolution and missing-key error
"""

import uuid
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from flowsint_enrichers.ip.to_security_risk import (
    IpToSecurityRisk,
    InputType,
    OutputType,
    _EVIDENCE_MULTIPLIERS,
    _EXPOSURE_SCORES,
    _EXPLOIT_SCORES,
    _SENSITIVITY_UNKNOWN,
    _CVSS_W,
    _EXPOSURE_W,
    _SENSITIVITY_W,
    _EXPLOIT_W,
    _compute_risk_score,
    _risk_level,
)
from flowsint_types.ip import Ip
from flowsint_types.port import Port
from flowsint_types.risk_profile import RiskProfile


# ---------------------------------------------------------------------------
# Shared Shodan response fixtures
# ---------------------------------------------------------------------------

SHODAN_RICH: Dict[str, Any] = {
    "ip_str": "1.2.3.4",
    "org": "Acme Corp",
    "asn": "AS12345",
    "isp": "Acme ISP",
    "country_name": "United States",
    "city": "New York",
    "hostnames": ["mail.example.com", "www.example.com"],
    "domains": ["example.com"],
    "ports": [22, 80, 443, 3306],
    "data": [
        {
            "port": 22,
            "transport": "tcp",
            "_shodan": {"module": "ssh"},
            "product": "OpenSSH",
            "data": "SSH-2.0-OpenSSH_8.0\n",
        },
        {
            "port": 80,
            "transport": "tcp",
            "_shodan": {"module": "http"},
            "product": "nginx",
            "data": "HTTP/1.1 200 OK\n",
        },
        {
            "port": 443,
            "transport": "tcp",
            "_shodan": {"module": "https"},
            "product": "nginx",
            "data": "HTTP/1.1 200 OK\n",
        },
        {
            "port": 3306,
            "transport": "tcp",
            "_shodan": {"module": "mysql"},
            "product": "MySQL",
            "data": "5.7.34\n",
        },
    ],
    "vulns": {
        "CVE-2021-44228": {"cvss": 10.0, "summary": "Log4Shell RCE"},
        "CVE-2021-45046": {"cvss": 9.0, "summary": "Log4Shell variant"},
    },
}

SHODAN_NO_CVES: Dict[str, Any] = {
    "ip_str": "5.6.7.8",
    "org": "Some ISP",
    "country_name": "Germany",
    "hostnames": [],
    "domains": [],
    "ports": [22, 80],
    "data": [
        {
            "port": 22,
            "transport": "tcp",
            "_shodan": {"module": "ssh"},
            "product": "OpenSSH",
            "data": "SSH banner",
        },
        {
            "port": 80,
            "transport": "tcp",
            "_shodan": {"module": "http"},
            "product": "Apache",
            "data": "HTTP/1.1 200 OK",
        },
    ],
    "vulns": {},
}

SHODAN_MINIMAL: Dict[str, Any] = {
    "ip_str": "9.9.9.9",
    "ports": [12345],
    "data": [],
    "vulns": {},
}

SHODAN_RDP_EXPOSED: Dict[str, Any] = {
    "ip_str": "2.3.4.5",
    "ports": [3389],
    "data": [
        {
            "port": 3389,
            "transport": "tcp",
            "_shodan": {"module": "rdp"},
            "product": "Microsoft Terminal Services",
            "data": "",
        }
    ],
    "vulns": {},
}

SHODAN_CVSS_ZERO: Dict[str, Any] = {
    "ip_str": "3.4.5.6",
    "ports": [80],
    "data": [
        {
            "port": 80,
            "transport": "tcp",
            "_shodan": {"module": "http"},
            "product": "nginx",
            "data": "HTTP/1.1 200 OK",
        }
    ],
    "vulns": {
        "CVE-2023-00001": {"cvss": 0.0, "summary": "Some CVE with missing CVSS"},
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_enricher(api_key: str = "test-shodan-key", graph_service=None) -> IpToSecurityRisk:
    """Construct an enricher with a pre-resolved API key and a mocked graph service."""
    mock_vault = Mock()
    mock_vault.get_secret.return_value = api_key

    enricher = IpToSecurityRisk(
        sketch_id=str(uuid.uuid4()),
        scan_id="test-scan",
        vault=mock_vault,
        params={},
    )

    # Inject a mock graph service so no real Neo4j connection is needed
    enricher._graph_service = graph_service or MagicMock()
    # Pre-set params to avoid needing async_init in most tests
    enricher.params = {"SHODAN_API_KEY": api_key}
    return enricher


# ---------------------------------------------------------------------------
# 1. Pure scoring helpers
# ---------------------------------------------------------------------------


class TestRiskLevel:
    def test_critical_at_75(self):
        assert _risk_level(75.0) == "critical"

    def test_critical_above_75(self):
        assert _risk_level(99.9) == "critical"

    def test_high_at_50(self):
        assert _risk_level(50.0) == "high"

    def test_high_below_75(self):
        assert _risk_level(74.9) == "high"

    def test_medium_at_25(self):
        assert _risk_level(25.0) == "medium"

    def test_medium_below_50(self):
        assert _risk_level(49.9) == "medium"

    def test_low_below_25(self):
        assert _risk_level(24.9) == "low"

    def test_low_at_zero(self):
        assert _risk_level(0.0) == "low"


class TestComputeRiskScore:
    def test_score_is_bounded_0_to_100(self):
        score = _compute_risk_score(10.0, "internet_facing", "active_exploitation", "correlated")
        assert 0.0 <= score <= 100.0

    def test_high_cvss_internet_facing_exploit_yields_critical(self):
        score = _compute_risk_score(10.0, "internet_facing", "public_exploit", "correlated")
        assert score >= 75.0

    def test_zero_cvss_internal_no_exploit_yields_low(self):
        score = _compute_risk_score(0.0, "internal", "no_exploit", "inferred")
        assert score < 50.0

    def test_internet_facing_scores_higher_than_internal(self):
        score_internet = _compute_risk_score(5.0, "internet_facing", "unknown", "inferred")
        score_internal = _compute_risk_score(5.0, "internal", "unknown", "inferred")
        assert score_internet > score_internal

    def test_correlated_evidence_scores_higher_than_inferred(self):
        score_corr = _compute_risk_score(5.0, "internet_facing", "unknown", "correlated")
        score_inf = _compute_risk_score(5.0, "internet_facing", "unknown", "inferred")
        assert score_corr > score_inf

    def test_public_exploit_scores_higher_than_no_exploit(self):
        score_exploit = _compute_risk_score(5.0, "internet_facing", "public_exploit", "correlated")
        score_none = _compute_risk_score(5.0, "internet_facing", "no_exploit", "correlated")
        assert score_exploit > score_none

    def test_formula_matches_manual_calculation(self):
        # CVSS=8.0, internet_facing(100), public_exploit(65), correlated(0.95)
        cvss_norm = (8.0 / 10.0) * 100.0  # 80
        base = (
            80.0 * _CVSS_W
            + 100.0 * _EXPOSURE_W
            + _SENSITIVITY_UNKNOWN * _SENSITIVITY_W
            + 65.0 * _EXPLOIT_W
        )
        expected = round(base * _EVIDENCE_MULTIPLIERS["correlated"], 2)
        assert _compute_risk_score(8.0, "internet_facing", "public_exploit", "correlated") == expected

    def test_unknown_exposure_uses_50(self):
        score = _compute_risk_score(5.0, "unknown", "unknown", "unknown")
        # Must use EXPOSURE_SCORES["unknown"] = 50
        cvss_norm = 50.0
        base = (
            cvss_norm * _CVSS_W
            + 50.0 * _EXPOSURE_W
            + _SENSITIVITY_UNKNOWN * _SENSITIVITY_W
            + 30.0 * _EXPLOIT_W
        )
        expected = round(base * _EVIDENCE_MULTIPLIERS["unknown"], 2)
        assert score == expected


# ---------------------------------------------------------------------------
# 2. _build_risk_profile — Shodan response parsing
# ---------------------------------------------------------------------------


class TestBuildRiskProfile:
    def setup_method(self):
        self.enricher = _make_enricher()

    def _build(self, address: str, host: Dict[str, Any]) -> RiskProfile:
        return self.enricher._build_risk_profile(address, host)

    # --- RiskProfile fields --------------------------------------------------

    def test_entity_id_matches_address(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.entity_id == "1.2.3.4"

    def test_entity_type_is_ip(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.entity_type == "IP"

    def test_source_is_shodan(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.source == "Shodan"

    def test_assessment_date_is_set(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.assessment_date is not None
        assert "Z" in profile.assessment_date

    def test_risk_level_is_valid_string(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.risk_level in ("low", "medium", "high", "critical")

    def test_overall_risk_score_in_range(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert 0.0 <= profile.overall_risk_score <= 100.0

    # --- CVE handling --------------------------------------------------------

    def test_cves_extracted_from_rich_response(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.vulnerabilities is not None
        assert "CVE-2021-44228" in profile.vulnerabilities
        assert "CVE-2021-45046" in profile.vulnerabilities

    def test_no_cves_when_vulns_empty(self):
        profile = self._build("5.6.7.8", SHODAN_NO_CVES)
        assert not profile.vulnerabilities

    def test_cvss_floor_applied_when_cves_present_but_cvss_zero(self):
        # CVE exists with CVSS=0 → must be floored to 6.5 before scoring
        profile_floored = self._build("3.4.5.6", SHODAN_CVSS_ZERO)
        # Compute what score WOULD be with CVSS=6.5 (floor)
        expected_score = _compute_risk_score(6.5, "internet_facing", "public_exploit", "correlated")
        assert profile_floored.overall_risk_score == expected_score

    def test_high_cvss_produces_higher_score_than_low(self):
        profile_high = self._build("1.2.3.4", SHODAN_RICH)   # CVSS 10.0
        profile_low = self._build("5.6.7.8", SHODAN_NO_CVES)  # no CVEs → CVSS 0
        assert profile_high.overall_risk_score > profile_low.overall_risk_score

    # --- Exposure detection --------------------------------------------------

    def test_internet_facing_via_service_name(self):
        # SHODAN_RICH has ssh/http/https/mysql modules → internet_facing
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.exposure_surface is not None
        # risk_factors should mention internet-facing
        assert profile.risk_factors is not None
        assert any("internet" in f.lower() for f in profile.risk_factors)

    def test_internet_facing_via_well_known_port_number(self):
        # Port 443 is in the known-ports set even if module name not recognised
        host = {
            "ip_str": "1.2.3.4",
            "ports": [443],
            "data": [{"port": 443, "transport": "tcp", "_shodan": {"module": ""}, "data": ""}],
            "vulns": {},
        }
        profile = self._build("1.2.3.4", host)
        assert any("internet" in f.lower() for f in (profile.risk_factors or []))

    def test_non_internet_facing_port_classified_unknown(self):
        # Only port 12345 open, no service name, no known-port match
        profile = self._build("9.9.9.9", SHODAN_MINIMAL)
        # No internet-facing risk factor expected
        internet_factors = [f for f in (profile.risk_factors or []) if "internet" in f.lower()]
        assert len(internet_factors) == 0

    # --- Exploit status and evidence -----------------------------------------

    def test_exploit_status_public_when_cves_present(self):
        # When CVEs exist, exploit_status → public_exploit, evidence → correlated
        # Risk score should use public_exploit (65) and correlated (0.95)
        profile = self._build("1.2.3.4", SHODAN_RICH)
        expected = _compute_risk_score(10.0, "internet_facing", "public_exploit", "correlated")
        assert profile.overall_risk_score == expected

    def test_exploit_status_unknown_when_no_cves(self):
        # No CVEs, internet-facing → unknown exploit, inferred evidence
        profile = self._build("5.6.7.8", SHODAN_NO_CVES)
        expected = _compute_risk_score(0.0, "internet_facing", "unknown", "inferred")
        assert profile.overall_risk_score == expected

    def test_minimal_host_uses_unknown_evidence(self):
        # No data[], no vulns → unknown evidence
        profile = self._build("9.9.9.9", SHODAN_MINIMAL)
        expected = _compute_risk_score(0.0, "unknown", "unknown", "unknown")
        assert profile.overall_risk_score == expected

    # --- Risk factors ---------------------------------------------------------

    def test_rdp_exposure_adds_risk_factor(self):
        profile = self._build("2.3.4.5", SHODAN_RDP_EXPOSED)
        assert profile.risk_factors is not None
        assert any("RDP" in f for f in profile.risk_factors)

    def test_ssh_exposure_adds_risk_factor(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.risk_factors is not None
        assert any("SSH" in f for f in profile.risk_factors)

    def test_database_exposure_adds_risk_factor(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)  # has port 3306
        assert profile.risk_factors is not None
        assert any("Database" in f or "database" in f for f in profile.risk_factors)

    def test_critical_cvss_adds_risk_factor(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)  # CVSS 10.0
        assert any("Critical" in f or "CVSS ≥ 9" in f for f in (profile.risk_factors or []))

    # --- Compliance risks -----------------------------------------------------

    def test_pci_compliance_risk_when_high_cvss_cves(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.compliance_risks is not None
        assert any("PCI" in r for r in profile.compliance_risks)

    def test_gdpr_compliance_risk_when_database_exposed(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)  # port 3306
        assert profile.compliance_risks is not None
        assert any("GDPR" in r for r in profile.compliance_risks)

    def test_no_compliance_risks_for_minimal_host(self):
        profile = self._build("9.9.9.9", SHODAN_MINIMAL)
        # No CVEs above CVSS 7.0, no DB ports → empty compliance_risks
        assert not profile.compliance_risks

    # --- Mitigations ----------------------------------------------------------

    def test_mitigations_non_empty_for_rich_host(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.mitigation_strategies
        assert len(profile.mitigation_strategies) > 0

    def test_rdp_mitigation_recommended(self):
        profile = self._build("2.3.4.5", SHODAN_RDP_EXPOSED)
        assert profile.mitigation_strategies is not None
        assert any("RDP" in m for m in profile.mitigation_strategies)

    def test_cve_patch_recommendation_included(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.mitigation_strategies is not None
        assert any("CVE" in m for m in profile.mitigation_strategies)

    # --- Exposure surface metadata -------------------------------------------

    def test_org_in_exposure_surface(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert profile.exposure_surface is not None
        assert "Acme Corp" in profile.exposure_surface

    def test_asn_in_exposure_surface(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert "AS12345" in profile.exposure_surface

    def test_country_in_exposure_surface(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert "United States" in profile.exposure_surface

    def test_open_ports_listed_in_exposure_surface(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        assert "22" in profile.exposure_surface
        assert "443" in profile.exposure_surface

    # --- Temp attribute for postprocess ---------------------------------------

    def test_shodan_ports_stored_as_temp_attribute(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        ports = getattr(profile, "_shodan_ports", None)
        assert ports is not None
        assert len(ports) == 4  # 22, 80, 443, 3306
        numbers = {p["number"] for p in ports}
        assert numbers == {22, 80, 443, 3306}

    def test_port_service_names_captured(self):
        profile = self._build("1.2.3.4", SHODAN_RICH)
        ports = getattr(profile, "_shodan_ports", [])
        port_22 = next(p for p in ports if p["number"] == 22)
        assert port_22["service"] == "ssh"

    def test_fallback_to_ports_list_when_no_banner_data(self):
        profile = self._build("9.9.9.9", SHODAN_MINIMAL)  # data=[], ports=[12345]
        ports = getattr(profile, "_shodan_ports", [])
        assert len(ports) == 1
        assert ports[0]["number"] == 12345

    # --- Confidence -----------------------------------------------------------

    def test_confidence_higher_when_cves_present(self):
        profile_with_cves = self._build("1.2.3.4", SHODAN_RICH)
        profile_without_cves = self._build("5.6.7.8", SHODAN_NO_CVES)
        assert profile_with_cves.confidence > profile_without_cves.confidence


# ---------------------------------------------------------------------------
# 3. scan() — async, mocked Shodan API
# ---------------------------------------------------------------------------


class TestScan:
    def setup_method(self):
        self.enricher = _make_enricher()

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_api_key_missing(self):
        self.enricher.params = {}  # no SHODAN_API_KEY
        results = await self.enricher.scan([Ip(address="1.2.3.4")])
        assert results == []

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_shodan_not_installed(self):
        with patch.dict("sys.modules", {"shodan": None}):
            results = await self.enricher.scan([Ip(address="1.2.3.4")])
        assert results == []

    @pytest.mark.asyncio
    async def test_happy_path_returns_one_profile_per_ip(self):
        mock_api = MagicMock()
        mock_api.host.return_value = SHODAN_RICH

        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as mock_shodan_mod:
            mock_shodan_mod.Shodan.return_value = mock_api
            mock_shodan_mod.APIError = Exception

            results = await self.enricher.scan([Ip(address="1.2.3.4")])

        assert len(results) == 1
        assert isinstance(results[0], RiskProfile)
        assert results[0].entity_id == "1.2.3.4"

    @pytest.mark.asyncio
    async def test_multiple_ips_each_get_a_profile(self):
        mock_api = MagicMock()
        mock_api.host.side_effect = [SHODAN_RICH, SHODAN_NO_CVES]

        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as mock_shodan_mod:
            mock_shodan_mod.Shodan.return_value = mock_api
            mock_shodan_mod.APIError = Exception

            results = await self.enricher.scan([
                Ip(address="1.2.3.4"),
                Ip(address="5.6.7.8"),
            ])

        assert len(results) == 2
        assert results[0].entity_id == "1.2.3.4"
        assert results[1].entity_id == "5.6.7.8"

    @pytest.mark.asyncio
    async def test_shodan_api_error_skips_ip_gracefully(self):
        class FakeShodanAPIError(Exception):
            pass

        mock_api = MagicMock()
        mock_api.host.side_effect = FakeShodanAPIError("No information available")

        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as mock_shodan_mod:
            mock_shodan_mod.Shodan.return_value = mock_api
            mock_shodan_mod.APIError = FakeShodanAPIError

            results = await self.enricher.scan([Ip(address="1.2.3.4")])

        assert results == []

    @pytest.mark.asyncio
    async def test_generic_exception_skips_ip_gracefully(self):
        mock_api = MagicMock()
        mock_api.host.side_effect = RuntimeError("connection reset")

        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as mock_shodan_mod:
            mock_shodan_mod.Shodan.return_value = mock_api
            mock_shodan_mod.APIError = Exception  # RuntimeError won't match this

            results = await self.enricher.scan([Ip(address="1.2.3.4")])

        assert results == []

    @pytest.mark.asyncio
    async def test_one_ip_fails_others_still_processed(self):
        class FakeShodanAPIError(Exception):
            pass

        mock_api = MagicMock()
        mock_api.host.side_effect = [
            FakeShodanAPIError("No info"),  # first IP fails
            SHODAN_NO_CVES,                  # second IP succeeds
        ]

        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as mock_shodan_mod:
            mock_shodan_mod.Shodan.return_value = mock_api
            mock_shodan_mod.APIError = FakeShodanAPIError

            results = await self.enricher.scan([
                Ip(address="1.2.3.4"),
                Ip(address="5.6.7.8"),
            ])

        assert len(results) == 1
        assert results[0].entity_id == "5.6.7.8"

    @pytest.mark.asyncio
    async def test_shodan_called_with_correct_ip(self):
        mock_api = MagicMock()
        mock_api.host.return_value = SHODAN_RICH

        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as mock_shodan_mod:
            mock_shodan_mod.Shodan.return_value = mock_api
            mock_shodan_mod.APIError = Exception

            await self.enricher.scan([Ip(address="1.2.3.4")])

        mock_api.host.assert_called_once_with("1.2.3.4")

    @pytest.mark.asyncio
    async def test_shodan_initialised_with_api_key(self):
        mock_api = MagicMock()
        mock_api.host.return_value = SHODAN_RICH

        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as mock_shodan_mod:
            mock_shodan_mod.Shodan.return_value = mock_api
            mock_shodan_mod.APIError = Exception

            await self.enricher.scan([Ip(address="1.2.3.4")])

        mock_shodan_mod.Shodan.assert_called_once_with("test-shodan-key")


# ---------------------------------------------------------------------------
# 4. postprocess() — graph node/relationship creation
# ---------------------------------------------------------------------------


class TestPostprocess:
    def setup_method(self):
        self.graph = MagicMock()
        self.enricher = _make_enricher(graph_service=self.graph)

    def _profile_with_ports(self, address: str = "1.2.3.4") -> RiskProfile:
        profile = self.enricher._build_risk_profile(address, SHODAN_RICH)
        return profile

    def test_creates_ip_node(self):
        profile = self._profile_with_ports()
        self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        calls = [str(c) for c in self.graph.create_node_from_flowsint_type.call_args_list]
        assert any("1.2.3.4" in c for c in calls)

    def test_creates_risk_profile_node(self):
        profile = self._profile_with_ports()
        self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        # At minimum two nodes: IP + RiskProfile
        assert self.graph.create_node_from_flowsint_type.call_count >= 2

    def test_creates_has_risk_profile_relationship(self):
        profile = self._profile_with_ports()
        self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        rel_labels = [
            call.args[2] if call.args else call.kwargs.get("rel_label")
            for call in self.graph.create_relationship.call_args_list
        ]
        assert "HAS_RISK_PROFILE" in rel_labels

    def test_creates_has_port_relationships_for_each_port(self):
        profile = self._profile_with_ports()
        self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        rel_labels = [
            call.args[2] if call.args else call.kwargs.get("rel_label")
            for call in self.graph.create_relationship.call_args_list
        ]
        # SHODAN_RICH has 4 ports → 4 HAS_PORT relationships + 1 HAS_RISK_PROFILE
        assert rel_labels.count("HAS_PORT") == 4

    def test_temp_attribute_cleaned_up_after_postprocess(self):
        profile = self._profile_with_ports()
        assert hasattr(profile, "_shodan_ports")
        self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        assert not hasattr(profile, "_shodan_ports")

    def test_no_crash_when_graph_service_is_none(self):
        self.enricher._graph_service = None
        profile = self._profile_with_ports()
        result = self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        assert result == [profile]

    def test_returns_results_unchanged(self):
        profile = self._profile_with_ports()
        result = self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        assert result == [profile]

    def test_handles_empty_results(self):
        result = self.enricher.postprocess([], [])
        assert result == []

    def test_flush_called_on_graph_service(self):
        # The base execute() calls flush(), but postprocess should not need to.
        # This test just ensures postprocess runs without error when flush IS called.
        profile = self._profile_with_ports()
        self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        # No assertion — just checks no exception is raised

    def test_ip_reconstructed_when_not_in_input_data(self):
        # If input_data is None, IP node should still be created from entity_id
        profile = self._profile_with_ports()
        self.enricher.postprocess([profile], None)
        self.graph.create_node_from_flowsint_type.assert_called()


# ---------------------------------------------------------------------------
# 5. Enricher metadata / registration
# ---------------------------------------------------------------------------


class TestEnricherMetadata:
    def test_name(self):
        assert IpToSecurityRisk.name() == "ip_to_security_risk"

    def test_category(self):
        assert IpToSecurityRisk.category() == "Ip"

    def test_key(self):
        assert IpToSecurityRisk.key() == "address"

    def test_input_type_is_ip(self):
        assert InputType is Ip

    def test_output_type_is_risk_profile(self):
        assert OutputType is RiskProfile

    def test_input_schema_type(self):
        schema = IpToSecurityRisk.input_schema()
        assert schema["type"] == "Ip"

    def test_output_schema_type(self):
        schema = IpToSecurityRisk.output_schema()
        assert schema["type"] == "RiskProfile"

    def test_required_params_is_true(self):
        assert IpToSecurityRisk.required_params() is True

    def test_params_schema_declares_shodan_key(self):
        schema = IpToSecurityRisk.get_params_schema()
        names = [p["name"] for p in schema]
        assert "SHODAN_API_KEY" in names

    def test_shodan_key_param_is_vault_secret(self):
        schema = IpToSecurityRisk.get_params_schema()
        shodan_param = next(p for p in schema if p["name"] == "SHODAN_API_KEY")
        assert shodan_param["type"] == "vaultSecret"

    def test_shodan_key_param_is_required(self):
        schema = IpToSecurityRisk.get_params_schema()
        shodan_param = next(p for p in schema if p["name"] == "SHODAN_API_KEY")
        assert shodan_param["required"] is True

    def test_documentation_mentions_shodan(self):
        doc = IpToSecurityRisk.documentation()
        assert "Shodan" in doc

    def test_documentation_mentions_risk_score(self):
        doc = IpToSecurityRisk.documentation()
        assert "risk" in doc.lower()

    def test_enricher_registered_in_global_registry(self):
        from flowsint_enrichers import ENRICHER_REGISTRY, load_all_enrichers
        load_all_enrichers()
        assert ENRICHER_REGISTRY.enricher_exists("ip_to_security_risk")


# ---------------------------------------------------------------------------
# 6. Vault integration
# ---------------------------------------------------------------------------


class TestVaultIntegration:
    @pytest.fixture
    def mock_vault(self):
        vault = Mock()
        vault.get_secret = Mock()
        return vault

    @pytest.fixture
    def sketch_id(self):
        return str(uuid.uuid4())

    @pytest.mark.asyncio
    async def test_api_key_resolved_from_vault(self, mock_vault, sketch_id):
        mock_vault.get_secret.return_value = "my-shodan-key"

        enricher = IpToSecurityRisk(
            sketch_id=sketch_id, scan_id="scan_1", vault=mock_vault, params={}
        )
        enricher._graph_service = MagicMock()
        await enricher.async_init()

        calls = [c[0][0] for c in mock_vault.get_secret.call_args_list]
        assert "SHODAN_API_KEY" in calls
        assert enricher.get_secret("SHODAN_API_KEY") == "my-shodan-key"

    @pytest.mark.asyncio
    async def test_missing_api_key_raises_on_async_init(self, mock_vault, sketch_id):
        mock_vault.get_secret.return_value = None  # key not in vault

        enricher = IpToSecurityRisk(
            sketch_id=sketch_id, scan_id="scan_1", vault=mock_vault, params={}
        )
        enricher._graph_service = MagicMock()

        with pytest.raises(Exception) as exc_info:
            await enricher.async_init()

        assert "SHODAN_API_KEY" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_user_provided_vault_id_takes_priority(self, mock_vault, sketch_id):
        vault_id = str(uuid.uuid4())
        mock_vault.get_secret.return_value = "resolved-key"

        enricher = IpToSecurityRisk(
            sketch_id=sketch_id,
            scan_id="scan_1",
            vault=mock_vault,
            params={"SHODAN_API_KEY": vault_id},
        )
        enricher._graph_service = MagicMock()
        await enricher.async_init()

        first_call = mock_vault.get_secret.call_args_list[0][0][0]
        assert first_call == vault_id
