"""
Tests for the ip_to_security_risk enricher.

Coverage:
- Pure scoring helpers (_compute_risk_score, _risk_level)
- NVD API helpers (_fetch_nvd_cvss, _resolve_cvss_scores)
- _build_risk_profile: various Shodan response shapes with pre-resolved scores
- scan(): happy path, missing API key, Shodan errors, NVD integration
- postprocess(): graph node/relationship creation
- Vault integration: SHODAN_API_KEY + NVD_API_KEY resolution
"""

import uuid
from typing import Any, Dict
from unittest.mock import MagicMock, Mock, call, patch

import pytest
import requests as requests_lib

from flowsint_enrichers.ip.to_security_risk import (
    IpToSecurityRisk,
    InputType,
    OutputType,
    _CVSS_W,
    _EVIDENCE_MULTIPLIERS,
    _EXPLOIT_SCORES,
    _EXPLOIT_W,
    _EXPOSURE_SCORES,
    _EXPOSURE_W,
    _NVD_FALLBACK_CVSS,
    _SENSITIVITY_UNKNOWN,
    _SENSITIVITY_W,
    _compute_risk_score,
    _fetch_nvd_cvss,
    _resolve_cvss_scores,
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

# CVSS_RICH_MAP is the pre-resolved version of SHODAN_RICH's vulns
CVSS_RICH_MAP: Dict[str, float] = {"CVE-2021-44228": 10.0, "CVE-2021-45046": 9.0}
CVSS_RICH_MAX = 10.0

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

# CVE with CVSS=0 from Shodan — needs NVD lookup
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

# NVD API v2 response shape helpers
def _nvd_response(cve_id: str, v31: float = None, v30: float = None, v2: float = None) -> dict:
    """Build a minimal NVD API v2 JSON response."""
    metrics: Dict[str, Any] = {}
    if v31 is not None:
        metrics["cvssMetricV31"] = [{"cvssData": {"baseScore": v31}}]
    if v30 is not None:
        metrics["cvssMetricV30"] = [{"cvssData": {"baseScore": v30}}]
    if v2 is not None:
        metrics["cvssMetricV2"] = [{"cvssData": {"baseScore": v2}}]
    return {
        "vulnerabilities": [{"cve": {"id": cve_id, "metrics": metrics}}]
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_enricher(api_key: str = "test-shodan-key", graph_service=None) -> IpToSecurityRisk:
    mock_vault = Mock()
    mock_vault.get_secret.return_value = api_key
    enricher = IpToSecurityRisk(
        sketch_id=str(uuid.uuid4()),
        scan_id="test-scan",
        vault=mock_vault,
        params={},
    )
    enricher._graph_service = graph_service or MagicMock()
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
        assert (
            _compute_risk_score(5.0, "internet_facing", "unknown", "inferred")
            > _compute_risk_score(5.0, "internal", "unknown", "inferred")
        )

    def test_correlated_evidence_scores_higher_than_inferred(self):
        assert (
            _compute_risk_score(5.0, "internet_facing", "unknown", "correlated")
            > _compute_risk_score(5.0, "internet_facing", "unknown", "inferred")
        )

    def test_public_exploit_scores_higher_than_no_exploit(self):
        assert (
            _compute_risk_score(5.0, "internet_facing", "public_exploit", "correlated")
            > _compute_risk_score(5.0, "internet_facing", "no_exploit", "correlated")
        )

    def test_formula_matches_manual_calculation(self):
        cvss_norm = (8.0 / 10.0) * 100.0
        base = (
            cvss_norm * _CVSS_W
            + 100.0 * _EXPOSURE_W
            + _SENSITIVITY_UNKNOWN * _SENSITIVITY_W
            + 65.0 * _EXPLOIT_W
        )
        expected = round(base * _EVIDENCE_MULTIPLIERS["correlated"], 2)
        assert _compute_risk_score(8.0, "internet_facing", "public_exploit", "correlated") == expected

    def test_unknown_exposure_uses_50(self):
        cvss_norm = 50.0
        base = (
            cvss_norm * _CVSS_W
            + 50.0 * _EXPOSURE_W
            + _SENSITIVITY_UNKNOWN * _SENSITIVITY_W
            + 30.0 * _EXPLOIT_W
        )
        expected = round(base * _EVIDENCE_MULTIPLIERS["unknown"], 2)
        assert _compute_risk_score(5.0, "unknown", "unknown", "unknown") == expected


# ---------------------------------------------------------------------------
# 2. _fetch_nvd_cvss — NVD API v2 single-CVE lookup
# ---------------------------------------------------------------------------


class TestFetchNvdCvss:
    def _mock_response(self, json_data: dict, status: int = 200) -> Mock:
        resp = Mock()
        resp.status_code = status
        resp.json.return_value = json_data
        resp.raise_for_status = Mock()
        if status >= 400:
            http_err = requests_lib.HTTPError(response=resp)
            resp.raise_for_status.side_effect = http_err
        return resp

    def test_returns_cvssv31_score(self):
        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get:
            mock_get.return_value = self._mock_response(
                _nvd_response("CVE-2021-44228", v31=10.0)
            )
            score = _fetch_nvd_cvss("CVE-2021-44228")
        assert score == 10.0

    def test_cvssv30_used_when_v31_missing(self):
        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get:
            mock_get.return_value = self._mock_response(
                _nvd_response("CVE-2020-0001", v30=7.5)
            )
            score = _fetch_nvd_cvss("CVE-2020-0001")
        assert score == 7.5

    def test_cvssv2_used_as_last_resort(self):
        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get:
            mock_get.return_value = self._mock_response(
                _nvd_response("CVE-2010-0001", v2=5.0)
            )
            score = _fetch_nvd_cvss("CVE-2010-0001")
        assert score == 5.0

    def test_v31_takes_priority_over_v30(self):
        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get:
            mock_get.return_value = self._mock_response(
                _nvd_response("CVE-2021-00001", v31=9.8, v30=7.5)
            )
            score = _fetch_nvd_cvss("CVE-2021-00001")
        assert score == 9.8

    def test_returns_none_for_404(self):
        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get:
            resp = Mock()
            resp.status_code = 404
            resp.raise_for_status = Mock()
            mock_get.return_value = resp
            score = _fetch_nvd_cvss("CVE-9999-99999")
        assert score is None

    def test_returns_none_when_no_vulnerabilities_in_response(self):
        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get:
            mock_get.return_value = self._mock_response({"vulnerabilities": []})
            score = _fetch_nvd_cvss("CVE-2021-44228")
        assert score is None

    def test_returns_none_when_metrics_empty(self):
        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get:
            mock_get.return_value = self._mock_response(
                {"vulnerabilities": [{"cve": {"id": "CVE-2021-44228", "metrics": {}}}]}
            )
            score = _fetch_nvd_cvss("CVE-2021-44228")
        assert score is None

    def test_api_key_sent_in_header(self):
        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get:
            mock_get.return_value = self._mock_response(
                _nvd_response("CVE-2021-44228", v31=10.0)
            )
            _fetch_nvd_cvss("CVE-2021-44228", api_key="my-nvd-key")
        _, kwargs = mock_get.call_args
        assert kwargs.get("headers", {}).get("apiKey") == "my-nvd-key"

    def test_no_auth_header_when_key_is_none(self):
        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get:
            mock_get.return_value = self._mock_response(
                _nvd_response("CVE-2021-44228", v31=10.0)
            )
            _fetch_nvd_cvss("CVE-2021-44228", api_key=None)
        _, kwargs = mock_get.call_args
        assert "apiKey" not in kwargs.get("headers", {})

    def test_cve_id_sent_as_query_param(self):
        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get:
            mock_get.return_value = self._mock_response(
                _nvd_response("CVE-2021-44228", v31=10.0)
            )
            _fetch_nvd_cvss("CVE-2021-44228")
        _, kwargs = mock_get.call_args
        assert kwargs.get("params", {}).get("cveId") == "CVE-2021-44228"

    def test_returns_none_on_network_exception(self):
        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get:
            mock_get.side_effect = ConnectionError("Network down")
            score = _fetch_nvd_cvss("CVE-2021-44228")
        assert score is None

    def test_retries_once_on_429_and_returns_score(self):
        resp_429 = Mock()
        resp_429.status_code = 429
        http_err = requests_lib.HTTPError(response=resp_429)
        resp_429.raise_for_status.side_effect = http_err

        resp_ok = Mock()
        resp_ok.status_code = 200
        resp_ok.raise_for_status = Mock()
        resp_ok.json.return_value = _nvd_response("CVE-2021-44228", v31=10.0)

        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get, \
             patch("flowsint_enrichers.ip.to_security_risk.time.sleep"):
            mock_get.side_effect = [resp_429, resp_ok]
            score = _fetch_nvd_cvss("CVE-2021-44228")

        assert score == 10.0
        assert mock_get.call_count == 2

    def test_returns_none_when_retry_after_429_also_fails(self):
        resp_429 = Mock()
        resp_429.status_code = 429
        http_err = requests_lib.HTTPError(response=resp_429)
        resp_429.raise_for_status.side_effect = http_err

        with patch("flowsint_enrichers.ip.to_security_risk.requests.get") as mock_get, \
             patch("flowsint_enrichers.ip.to_security_risk.time.sleep"):
            mock_get.side_effect = [resp_429, ConnectionError("still down")]
            score = _fetch_nvd_cvss("CVE-2021-44228")

        assert score is None


# ---------------------------------------------------------------------------
# 3. _resolve_cvss_scores — per-CVE resolution logic
# ---------------------------------------------------------------------------


class TestResolveCvssScores:
    def test_uses_shodan_score_when_nonzero(self):
        raw_vulns = {"CVE-2021-44228": {"cvss": 10.0}, "CVE-2021-45046": {"cvss": 9.0}}
        with patch("flowsint_enrichers.ip.to_security_risk._fetch_nvd_cvss") as mock_nvd, \
             patch("flowsint_enrichers.ip.to_security_risk.time.sleep"):
            cvss_map, max_cvss = _resolve_cvss_scores(raw_vulns)
        mock_nvd.assert_not_called()
        assert cvss_map == {"CVE-2021-44228": 10.0, "CVE-2021-45046": 9.0}
        assert max_cvss == 10.0

    def test_calls_nvd_when_shodan_score_is_zero(self):
        raw_vulns = {"CVE-2023-00001": {"cvss": 0.0}}
        with patch("flowsint_enrichers.ip.to_security_risk._fetch_nvd_cvss") as mock_nvd, \
             patch("flowsint_enrichers.ip.to_security_risk.time.sleep"):
            mock_nvd.return_value = 7.5
            cvss_map, max_cvss = _resolve_cvss_scores(raw_vulns)
        mock_nvd.assert_called_once_with("CVE-2023-00001", None)
        assert cvss_map["CVE-2023-00001"] == 7.5
        assert max_cvss == 7.5

    def test_calls_nvd_when_shodan_score_is_null(self):
        raw_vulns = {"CVE-2023-00002": {"cvss": None}}
        with patch("flowsint_enrichers.ip.to_security_risk._fetch_nvd_cvss") as mock_nvd, \
             patch("flowsint_enrichers.ip.to_security_risk.time.sleep"):
            mock_nvd.return_value = 8.1
            cvss_map, _ = _resolve_cvss_scores(raw_vulns)
        assert cvss_map["CVE-2023-00002"] == 8.1

    def test_calls_nvd_when_shodan_score_missing(self):
        raw_vulns = {"CVE-2023-00003": {}}  # no "cvss" key at all
        with patch("flowsint_enrichers.ip.to_security_risk._fetch_nvd_cvss") as mock_nvd, \
             patch("flowsint_enrichers.ip.to_security_risk.time.sleep"):
            mock_nvd.return_value = 5.3
            cvss_map, _ = _resolve_cvss_scores(raw_vulns)
        assert cvss_map["CVE-2023-00003"] == 5.3

    def test_fallback_to_6_5_when_both_shodan_and_nvd_fail(self):
        raw_vulns = {"CVE-2023-00001": {"cvss": 0.0}}
        with patch("flowsint_enrichers.ip.to_security_risk._fetch_nvd_cvss") as mock_nvd, \
             patch("flowsint_enrichers.ip.to_security_risk.time.sleep"):
            mock_nvd.return_value = None  # NVD also has no data
            cvss_map, max_cvss = _resolve_cvss_scores(raw_vulns)
        assert cvss_map["CVE-2023-00001"] == _NVD_FALLBACK_CVSS
        assert max_cvss == _NVD_FALLBACK_CVSS

    def test_mixed_sources_in_same_call(self):
        # One CVE has a Shodan score; the other needs NVD
        raw_vulns = {
            "CVE-2021-44228": {"cvss": 10.0},   # Shodan has it
            "CVE-2023-00001": {"cvss": 0.0},     # Shodan missing → NVD
        }
        with patch("flowsint_enrichers.ip.to_security_risk._fetch_nvd_cvss") as mock_nvd, \
             patch("flowsint_enrichers.ip.to_security_risk.time.sleep"):
            mock_nvd.return_value = 7.5
            cvss_map, max_cvss = _resolve_cvss_scores(raw_vulns)
        mock_nvd.assert_called_once_with("CVE-2023-00001", None)
        assert cvss_map["CVE-2021-44228"] == 10.0
        assert cvss_map["CVE-2023-00001"] == 7.5
        assert max_cvss == 10.0

    def test_empty_vulns_returns_empty_map_and_zero(self):
        cvss_map, max_cvss = _resolve_cvss_scores({})
        assert cvss_map == {}
        assert max_cvss == 0.0

    def test_nvd_api_key_forwarded_to_fetch(self):
        raw_vulns = {"CVE-2023-00001": {"cvss": 0.0}}
        with patch("flowsint_enrichers.ip.to_security_risk._fetch_nvd_cvss") as mock_nvd, \
             patch("flowsint_enrichers.ip.to_security_risk.time.sleep"):
            mock_nvd.return_value = 7.5
            _resolve_cvss_scores(raw_vulns, nvd_api_key="my-nvd-key")
        mock_nvd.assert_called_once_with("CVE-2023-00001", "my-nvd-key")

    def test_delay_called_for_each_nvd_lookup(self):
        raw_vulns = {
            "CVE-2023-00001": {"cvss": 0.0},
            "CVE-2023-00002": {"cvss": 0.0},
        }
        with patch("flowsint_enrichers.ip.to_security_risk._fetch_nvd_cvss") as mock_nvd, \
             patch("flowsint_enrichers.ip.to_security_risk.time.sleep") as mock_sleep:
            mock_nvd.return_value = 5.0
            _resolve_cvss_scores(raw_vulns)
        assert mock_sleep.call_count == 2

    def test_no_delay_when_all_scores_from_shodan(self):
        raw_vulns = {
            "CVE-2021-44228": {"cvss": 10.0},
            "CVE-2021-45046": {"cvss": 9.0},
        }
        with patch("flowsint_enrichers.ip.to_security_risk.time.sleep") as mock_sleep:
            _resolve_cvss_scores(raw_vulns)
        mock_sleep.assert_not_called()

    def test_max_cvss_reflects_highest_resolved_score(self):
        raw_vulns = {
            "CVE-A": {"cvss": 4.0},
            "CVE-B": {"cvss": 0.0},
        }
        with patch("flowsint_enrichers.ip.to_security_risk._fetch_nvd_cvss") as mock_nvd, \
             patch("flowsint_enrichers.ip.to_security_risk.time.sleep"):
            mock_nvd.return_value = 9.8
            _, max_cvss = _resolve_cvss_scores(raw_vulns)
        assert max_cvss == 9.8


# ---------------------------------------------------------------------------
# 4. _build_risk_profile — Shodan response parsing with real CVSS scores
# ---------------------------------------------------------------------------


class TestBuildRiskProfile:
    def setup_method(self):
        self.enricher = _make_enricher()

    def _build(
        self,
        address: str,
        host: Dict[str, Any],
        cvss_per_cve: Dict[str, float],
        max_cvss: float,
    ) -> RiskProfile:
        return self.enricher._build_risk_profile(address, host, cvss_per_cve, max_cvss)

    # --- RiskProfile fields --------------------------------------------------

    def test_entity_id_matches_address(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert p.entity_id == "1.2.3.4"

    def test_entity_type_is_ip(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert p.entity_type == "IP"

    def test_source_is_shodan(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert p.source == "Shodan"

    def test_assessment_date_is_set(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert p.assessment_date and "Z" in p.assessment_date

    def test_risk_level_is_valid(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert p.risk_level in ("low", "medium", "high", "critical")

    def test_overall_risk_score_in_range(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert 0.0 <= p.overall_risk_score <= 100.0

    # --- CVE handling --------------------------------------------------------

    def test_cves_extracted_from_cvss_map(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert "CVE-2021-44228" in p.vulnerabilities
        assert "CVE-2021-45046" in p.vulnerabilities

    def test_no_cves_when_cvss_map_empty(self):
        p = self._build("5.6.7.8", SHODAN_NO_CVES, {}, 0.0)
        assert not p.vulnerabilities

    def test_high_cvss_produces_higher_score_than_low(self):
        p_high = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        p_low = self._build("5.6.7.8", SHODAN_NO_CVES, {}, 0.0)
        assert p_high.overall_risk_score > p_low.overall_risk_score

    def test_nvd_resolved_score_used_correctly(self):
        # When NVD returned 7.5 for a CVE, the score must use 7.5, not 6.5
        nvd_map = {"CVE-2023-00001": 7.5}
        p = self._build("3.4.5.6", SHODAN_CVSS_ZERO, nvd_map, 7.5)
        expected = _compute_risk_score(7.5, "internet_facing", "public_exploit", "correlated")
        assert p.overall_risk_score == expected

    def test_fallback_score_used_when_nvd_also_failed(self):
        # When both Shodan and NVD failed, the fallback 6.5 must drive the score
        fallback_map = {"CVE-2023-00001": _NVD_FALLBACK_CVSS}
        p = self._build("3.4.5.6", SHODAN_CVSS_ZERO, fallback_map, _NVD_FALLBACK_CVSS)
        expected = _compute_risk_score(_NVD_FALLBACK_CVSS, "internet_facing", "public_exploit", "correlated")
        assert p.overall_risk_score == expected

    # --- Scoring formula correctness -----------------------------------------

    def test_exploit_status_public_when_cves_present(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        expected = _compute_risk_score(10.0, "internet_facing", "public_exploit", "correlated")
        assert p.overall_risk_score == expected

    def test_exploit_status_unknown_when_no_cves(self):
        p = self._build("5.6.7.8", SHODAN_NO_CVES, {}, 0.0)
        expected = _compute_risk_score(0.0, "internet_facing", "unknown", "inferred")
        assert p.overall_risk_score == expected

    def test_minimal_host_uses_unknown_evidence(self):
        p = self._build("9.9.9.9", SHODAN_MINIMAL, {}, 0.0)
        expected = _compute_risk_score(0.0, "unknown", "unknown", "unknown")
        assert p.overall_risk_score == expected

    # --- Exposure detection --------------------------------------------------

    def test_internet_facing_via_service_name(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert any("internet" in f.lower() for f in (p.risk_factors or []))

    def test_internet_facing_via_well_known_port_number(self):
        host = {
            "ip_str": "1.2.3.4", "ports": [443],
            "data": [{"port": 443, "transport": "tcp", "_shodan": {"module": ""}, "data": ""}],
            "vulns": {},
        }
        p = self._build("1.2.3.4", host, {}, 0.0)
        assert any("internet" in f.lower() for f in (p.risk_factors or []))

    def test_non_internet_facing_port_no_internet_factor(self):
        p = self._build("9.9.9.9", SHODAN_MINIMAL, {}, 0.0)
        assert not any("internet" in f.lower() for f in (p.risk_factors or []))

    # --- Risk factors ---------------------------------------------------------

    def test_risk_factors_show_real_per_cve_scores(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        cve_factor = next((f for f in (p.risk_factors or []) if "CVE" in f), None)
        assert cve_factor is not None
        assert "10.0" in cve_factor
        assert "9.0" in cve_factor

    def test_rdp_exposure_adds_risk_factor(self):
        p = self._build("2.3.4.5", SHODAN_RDP_EXPOSED, {}, 0.0)
        assert any("RDP" in f for f in (p.risk_factors or []))

    def test_ssh_exposure_adds_risk_factor(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert any("SSH" in f for f in (p.risk_factors or []))

    def test_database_exposure_adds_risk_factor(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert any("Database" in f or "database" in f for f in (p.risk_factors or []))

    def test_critical_cvss_adds_risk_factor(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert any("CVSS ≥ 9" in f for f in (p.risk_factors or []))

    # --- Compliance risks -----------------------------------------------------

    def test_pci_compliance_risk_when_high_cvss_cves(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert any("PCI" in r for r in (p.compliance_risks or []))

    def test_gdpr_compliance_risk_when_database_exposed(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert any("GDPR" in r for r in (p.compliance_risks or []))

    def test_no_compliance_risks_for_minimal_host(self):
        p = self._build("9.9.9.9", SHODAN_MINIMAL, {}, 0.0)
        assert not p.compliance_risks

    # --- Mitigations ----------------------------------------------------------

    def test_mitigations_non_empty_for_rich_host(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert p.mitigation_strategies and len(p.mitigation_strategies) > 0

    def test_rdp_mitigation_recommended(self):
        p = self._build("2.3.4.5", SHODAN_RDP_EXPOSED, {}, 0.0)
        assert any("RDP" in m for m in (p.mitigation_strategies or []))

    def test_cve_patch_recommendation_included(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert any("CVE" in m for m in (p.mitigation_strategies or []))

    # --- Exposure surface metadata -------------------------------------------

    def test_org_in_exposure_surface(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert "Acme Corp" in (p.exposure_surface or "")

    def test_asn_in_exposure_surface(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert "AS12345" in (p.exposure_surface or "")

    def test_open_ports_in_exposure_surface(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        assert "22" in (p.exposure_surface or "") and "443" in (p.exposure_surface or "")

    # --- Temp attribute for postprocess ---------------------------------------

    def test_shodan_ports_stored_as_temp_attribute(self):
        p = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        ports = getattr(p, "_shodan_ports", None)
        assert ports is not None and len(ports) == 4

    def test_fallback_to_ports_list_when_no_banner_data(self):
        p = self._build("9.9.9.9", SHODAN_MINIMAL, {}, 0.0)
        ports = getattr(p, "_shodan_ports", [])
        assert len(ports) == 1 and ports[0]["number"] == 12345

    # --- Confidence -----------------------------------------------------------

    def test_confidence_higher_when_cves_present(self):
        p_cves = self._build("1.2.3.4", SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX)
        p_none = self._build("5.6.7.8", SHODAN_NO_CVES, {}, 0.0)
        assert p_cves.confidence > p_none.confidence


# ---------------------------------------------------------------------------
# 5. scan() — async, mocked Shodan + _resolve_cvss_scores
# ---------------------------------------------------------------------------


class TestScan:
    def setup_method(self):
        self.enricher = _make_enricher()

    def _patch_scan(self, host_return=None, host_side_effect=None):
        """Context manager that patches both Shodan and _resolve_cvss_scores."""
        mock_api = MagicMock()
        if host_side_effect:
            mock_api.host.side_effect = host_side_effect
        else:
            mock_api.host.return_value = host_return

        shodan_patch = patch("flowsint_enrichers.ip.to_security_risk.shodan")
        resolve_patch = patch(
            "flowsint_enrichers.ip.to_security_risk._resolve_cvss_scores",
            return_value=(CVSS_RICH_MAP, CVSS_RICH_MAX),
        )
        return shodan_patch, resolve_patch, mock_api

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_api_key_missing(self):
        self.enricher.params = {}
        results = await self.enricher.scan([Ip(address="1.2.3.4")])
        assert results == []

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_shodan_not_installed(self):
        with patch.dict("sys.modules", {"shodan": None}):
            results = await self.enricher.scan([Ip(address="1.2.3.4")])
        assert results == []

    @pytest.mark.asyncio
    async def test_happy_path_returns_one_profile_per_ip(self):
        sp, rp, mock_api = self._patch_scan(host_return=SHODAN_RICH)
        with sp as ms, rp:
            ms.Shodan.return_value = mock_api
            ms.APIError = Exception
            results = await self.enricher.scan([Ip(address="1.2.3.4")])
        assert len(results) == 1
        assert isinstance(results[0], RiskProfile)
        assert results[0].entity_id == "1.2.3.4"

    @pytest.mark.asyncio
    async def test_multiple_ips_each_get_a_profile(self):
        mock_api = MagicMock()
        mock_api.host.side_effect = [SHODAN_RICH, SHODAN_NO_CVES]
        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as ms, \
             patch("flowsint_enrichers.ip.to_security_risk._resolve_cvss_scores",
                   side_effect=[(CVSS_RICH_MAP, CVSS_RICH_MAX), ({}, 0.0)]):
            ms.Shodan.return_value = mock_api
            ms.APIError = Exception
            results = await self.enricher.scan([Ip(address="1.2.3.4"), Ip(address="5.6.7.8")])
        assert len(results) == 2
        assert results[0].entity_id == "1.2.3.4"
        assert results[1].entity_id == "5.6.7.8"

    @pytest.mark.asyncio
    async def test_shodan_api_error_skips_ip_gracefully(self):
        class FakeAPIError(Exception):
            pass

        mock_api = MagicMock()
        mock_api.host.side_effect = FakeAPIError("No info")
        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as ms, \
             patch("flowsint_enrichers.ip.to_security_risk._resolve_cvss_scores"):
            ms.Shodan.return_value = mock_api
            ms.APIError = FakeAPIError
            results = await self.enricher.scan([Ip(address="1.2.3.4")])
        assert results == []

    @pytest.mark.asyncio
    async def test_generic_exception_skips_ip_gracefully(self):
        mock_api = MagicMock()
        mock_api.host.side_effect = RuntimeError("reset")
        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as ms, \
             patch("flowsint_enrichers.ip.to_security_risk._resolve_cvss_scores"):
            ms.Shodan.return_value = mock_api
            ms.APIError = Exception
            results = await self.enricher.scan([Ip(address="1.2.3.4")])
        assert results == []

    @pytest.mark.asyncio
    async def test_one_ip_fails_others_still_processed(self):
        class FakeAPIError(Exception):
            pass

        mock_api = MagicMock()
        mock_api.host.side_effect = [FakeAPIError("no info"), SHODAN_NO_CVES]
        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as ms, \
             patch("flowsint_enrichers.ip.to_security_risk._resolve_cvss_scores",
                   return_value=({}, 0.0)):
            ms.Shodan.return_value = mock_api
            ms.APIError = FakeAPIError
            results = await self.enricher.scan([Ip(address="1.2.3.4"), Ip(address="5.6.7.8")])
        assert len(results) == 1
        assert results[0].entity_id == "5.6.7.8"

    @pytest.mark.asyncio
    async def test_shodan_called_with_correct_ip(self):
        sp, rp, mock_api = self._patch_scan(host_return=SHODAN_RICH)
        with sp as ms, rp:
            ms.Shodan.return_value = mock_api
            ms.APIError = Exception
            await self.enricher.scan([Ip(address="1.2.3.4")])
        mock_api.host.assert_called_once_with("1.2.3.4")

    @pytest.mark.asyncio
    async def test_shodan_initialised_with_api_key(self):
        sp, rp, mock_api = self._patch_scan(host_return=SHODAN_RICH)
        with sp as ms, rp:
            ms.Shodan.return_value = mock_api
            ms.APIError = Exception
            await self.enricher.scan([Ip(address="1.2.3.4")])
        ms.Shodan.assert_called_once_with("test-shodan-key")

    @pytest.mark.asyncio
    async def test_resolve_cvss_called_with_vulns_and_nvd_key(self):
        self.enricher.params["NVD_API_KEY"] = "my-nvd-key"
        mock_api = MagicMock()
        mock_api.host.return_value = SHODAN_RICH
        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as ms, \
             patch("flowsint_enrichers.ip.to_security_risk._resolve_cvss_scores",
                   return_value=(CVSS_RICH_MAP, CVSS_RICH_MAX)) as mock_resolve:
            ms.Shodan.return_value = mock_api
            ms.APIError = Exception
            await self.enricher.scan([Ip(address="1.2.3.4")])
        mock_resolve.assert_called_once_with(SHODAN_RICH["vulns"], "my-nvd-key")

    @pytest.mark.asyncio
    async def test_resolve_cvss_called_with_none_when_no_nvd_key(self):
        mock_api = MagicMock()
        mock_api.host.return_value = SHODAN_RICH
        with patch("flowsint_enrichers.ip.to_security_risk.shodan") as ms, \
             patch("flowsint_enrichers.ip.to_security_risk._resolve_cvss_scores",
                   return_value=(CVSS_RICH_MAP, CVSS_RICH_MAX)) as mock_resolve:
            ms.Shodan.return_value = mock_api
            ms.APIError = Exception
            await self.enricher.scan([Ip(address="1.2.3.4")])
        mock_resolve.assert_called_once_with(SHODAN_RICH["vulns"], None)


# ---------------------------------------------------------------------------
# 6. postprocess() — graph node/relationship creation
# ---------------------------------------------------------------------------


class TestPostprocess:
    def setup_method(self):
        self.graph = MagicMock()
        self.enricher = _make_enricher(graph_service=self.graph)

    def _profile(self, address: str = "1.2.3.4") -> RiskProfile:
        return self.enricher._build_risk_profile(
            address, SHODAN_RICH, CVSS_RICH_MAP, CVSS_RICH_MAX
        )

    def test_creates_ip_and_risk_profile_nodes(self):
        profile = self._profile()
        self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        assert self.graph.create_node_from_flowsint_type.call_count >= 2

    def test_creates_has_risk_profile_relationship(self):
        profile = self._profile()
        self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        rel_labels = [
            c.args[2] if c.args else c.kwargs.get("rel_label")
            for c in self.graph.create_relationship.call_args_list
        ]
        assert "HAS_RISK_PROFILE" in rel_labels

    def test_creates_has_port_for_each_port(self):
        profile = self._profile()
        self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        rel_labels = [
            c.args[2] if c.args else c.kwargs.get("rel_label")
            for c in self.graph.create_relationship.call_args_list
        ]
        # SHODAN_RICH has 4 ports
        assert rel_labels.count("HAS_PORT") == 4

    def test_temp_attribute_cleaned_up(self):
        profile = self._profile()
        assert hasattr(profile, "_shodan_ports")
        self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        assert not hasattr(profile, "_shodan_ports")

    def test_no_crash_when_graph_service_is_none(self):
        self.enricher._graph_service = None
        profile = self._profile()
        result = self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        assert result == [profile]

    def test_returns_results_unchanged(self):
        profile = self._profile()
        result = self.enricher.postprocess([profile], [Ip(address="1.2.3.4")])
        assert result == [profile]

    def test_handles_empty_results(self):
        assert self.enricher.postprocess([], []) == []

    def test_ip_reconstructed_when_input_data_is_none(self):
        profile = self._profile()
        self.enricher.postprocess([profile], None)
        self.graph.create_node_from_flowsint_type.assert_called()


# ---------------------------------------------------------------------------
# 7. Enricher metadata / registration
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
        assert IpToSecurityRisk.input_schema()["type"] == "Ip"

    def test_output_schema_type(self):
        assert IpToSecurityRisk.output_schema()["type"] == "RiskProfile"

    def test_required_params_is_true(self):
        assert IpToSecurityRisk.required_params() is True

    def test_params_schema_has_shodan_key(self):
        names = [p["name"] for p in IpToSecurityRisk.get_params_schema()]
        assert "SHODAN_API_KEY" in names

    def test_shodan_key_is_required_vault_secret(self):
        param = next(p for p in IpToSecurityRisk.get_params_schema() if p["name"] == "SHODAN_API_KEY")
        assert param["type"] == "vaultSecret"
        assert param["required"] is True

    def test_params_schema_has_nvd_key(self):
        names = [p["name"] for p in IpToSecurityRisk.get_params_schema()]
        assert "NVD_API_KEY" in names

    def test_nvd_key_is_optional_vault_secret(self):
        param = next(p for p in IpToSecurityRisk.get_params_schema() if p["name"] == "NVD_API_KEY")
        assert param["type"] == "vaultSecret"
        assert param["required"] is False

    def test_documentation_mentions_shodan(self):
        assert "Shodan" in IpToSecurityRisk.documentation()

    def test_documentation_mentions_nvd(self):
        assert "NVD" in IpToSecurityRisk.documentation()

    def test_documentation_mentions_risk_score(self):
        assert "risk" in IpToSecurityRisk.documentation().lower()

    def test_enricher_registered_in_global_registry(self):
        from flowsint_enrichers import ENRICHER_REGISTRY, load_all_enrichers
        load_all_enrichers()
        assert ENRICHER_REGISTRY.enricher_exists("ip_to_security_risk")


# ---------------------------------------------------------------------------
# 8. Vault integration
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
    async def test_shodan_api_key_resolved_from_vault(self, mock_vault, sketch_id):
        mock_vault.get_secret.return_value = "my-shodan-key"
        enricher = IpToSecurityRisk(
            sketch_id=sketch_id, scan_id="s1", vault=mock_vault, params={}
        )
        enricher._graph_service = MagicMock()
        await enricher.async_init()
        calls = [c[0][0] for c in mock_vault.get_secret.call_args_list]
        assert "SHODAN_API_KEY" in calls
        assert enricher.get_secret("SHODAN_API_KEY") == "my-shodan-key"

    @pytest.mark.asyncio
    async def test_missing_shodan_key_raises_on_async_init(self, mock_vault, sketch_id):
        mock_vault.get_secret.return_value = None
        enricher = IpToSecurityRisk(
            sketch_id=sketch_id, scan_id="s1", vault=mock_vault, params={}
        )
        enricher._graph_service = MagicMock()
        with pytest.raises(Exception) as exc_info:
            await enricher.async_init()
        assert "SHODAN_API_KEY" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_nvd_api_key_resolved_from_vault(self, mock_vault, sketch_id):
        mock_vault.get_secret.side_effect = lambda name: (
            "shodan-key" if name == "SHODAN_API_KEY" else
            "nvd-key" if name == "NVD_API_KEY" else None
        )
        enricher = IpToSecurityRisk(
            sketch_id=sketch_id, scan_id="s1", vault=mock_vault, params={}
        )
        enricher._graph_service = MagicMock()
        await enricher.async_init()
        assert enricher.get_secret("NVD_API_KEY") == "nvd-key"

    @pytest.mark.asyncio
    async def test_nvd_key_optional_enricher_still_inits_without_it(self, mock_vault, sketch_id):
        # NVD key missing → no error (it's optional)
        mock_vault.get_secret.side_effect = lambda name: (
            "shodan-key" if name == "SHODAN_API_KEY" else None
        )
        enricher = IpToSecurityRisk(
            sketch_id=sketch_id, scan_id="s1", vault=mock_vault, params={}
        )
        enricher._graph_service = MagicMock()
        await enricher.async_init()  # must not raise
        assert enricher.get_secret("SHODAN_API_KEY") == "shodan-key"

    @pytest.mark.asyncio
    async def test_user_provided_vault_id_takes_priority(self, mock_vault, sketch_id):
        vault_id = str(uuid.uuid4())
        mock_vault.get_secret.return_value = "resolved-key"
        enricher = IpToSecurityRisk(
            sketch_id=sketch_id, scan_id="s1", vault=mock_vault,
            params={"SHODAN_API_KEY": vault_id},
        )
        enricher._graph_service = MagicMock()
        await enricher.async_init()
        assert mock_vault.get_secret.call_args_list[0][0][0] == vault_id
