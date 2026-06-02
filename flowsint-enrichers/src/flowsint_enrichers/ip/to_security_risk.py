import datetime
from typing import Any, Dict, List, Optional

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.ip import Ip
from flowsint_types.port import Port
from flowsint_types.risk_profile import RiskProfile


# Scoring weights (sum to 1.0)
_CVSS_W = 0.35
_EXPOSURE_W = 0.25
_SENSITIVITY_W = 0.25
_EXPLOIT_W = 0.15

# Factor lookup tables (mirrors RedFlag triage.py)
_EXPOSURE_SCORES: Dict[str, float] = {
    "internet_facing": 100.0,
    "partner": 60.0,
    "internal": 30.0,
    "unknown": 50.0,
}

_EXPLOIT_SCORES: Dict[str, float] = {
    "active_exploitation": 100.0,
    "public_exploit": 65.0,
    "no_exploit": 10.0,
    "unknown": 30.0,
}

# Sensitivity always UNKNOWN here (no asset-inventory layer)
_SENSITIVITY_UNKNOWN = 50.0

# Evidence strength multipliers
_EVIDENCE_MULTIPLIERS: Dict[str, float] = {
    "correlated": 0.95,   # Shodan has CVEs + confirms port
    "inferred": 0.85,     # Shodan data only, no CVE cross-reference
    "unknown": 0.90,      # Shodan host found but minimal data
}

# Services whose presence on the internet signals INTERNET_FACING exposure
_INTERNET_FACING_SERVICES = {
    "http", "https", "ftp", "ssh", "rdp", "telnet",
    "smtp", "pop3", "imap", "dns", "mqtt", "vnc",
    "mssql", "mysql", "postgresql", "mongodb", "redis",
    "elasticsearch", "memcached", "cassandra",
}

# Risk-level bands matching RedFlag deal-tier mapping
def _risk_level(score: float) -> str:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


def _compute_risk_score(
    max_cvss: float,
    exposure: str,
    exploit_status: str,
    evidence: str,
) -> float:
    """
    Weighted risk score (0–100) adapted from RedFlag's triage model.

    score = (cvss_norm * 0.35) + (exposure * 0.25) + (sensitivity * 0.25) + (exploit * 0.15)
    then multiplied by evidence-strength multiplier.
    """
    cvss_norm = (max_cvss / 10.0) * 100.0
    base = (
        cvss_norm * _CVSS_W
        + _EXPOSURE_SCORES.get(exposure, 50.0) * _EXPOSURE_W
        + _SENSITIVITY_UNKNOWN * _SENSITIVITY_W
        + _EXPLOIT_SCORES.get(exploit_status, 30.0) * _EXPLOIT_W
    )
    return round(min(base * _EVIDENCE_MULTIPLIERS.get(evidence, 0.90), 100.0), 2)


@flowsint_enricher
class IpToSecurityRisk(Enricher):
    """
    [Shodan] Cybersecurity risk assessment for an IP address.

    Queries Shodan for open ports, banners, CVEs, and host metadata, then applies
    a weighted risk-scoring model (CVSS × exposure × exploit status × evidence
    strength) to produce a 0–100 risk score with critical / high / medium / low
    classification.

    The scoring formula is adapted from RedFlag, an M&A due-diligence tool:
        score = (cvss_normalised * 0.35)
              + (exposure_score  * 0.25)
              + (sensitivity_score * 0.25)   # always 50 — no asset-inventory layer
              + (exploit_score   * 0.15)
        then multiplied by an evidence-strength multiplier (0.85 – 0.95).

    Exposure is inferred from open port/service names:
        • INTERNET_FACING (100) — HTTP, HTTPS, SSH, RDP, FTP, SMTP, databases, etc.
        • UNKNOWN (50) — service not in known internet-facing list

    Evidence strength:
        • CORRELATED (×0.95) — Shodan has CVEs AND confirms the port is open
        • INFERRED   (×0.85) — Shodan host data found but no linked CVEs
        • UNKNOWN    (×0.90) — Shodan returned minimal data

    Outputs one RiskProfile node per IP and creates Port nodes for every open
    port Shodan reports.  Graph relationships created:
        (Ip) -[HAS_RISK_PROFILE]-> (RiskProfile)
        (Ip) -[HAS_PORT]->         (Port)
    """

    InputType = Ip
    OutputType = RiskProfile

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        return [
            {
                "name": "SHODAN_API_KEY",
                "type": "vaultSecret",
                "description": "Shodan API key (1 credit per IP lookup).",
                "required": True,
            },
        ]

    @classmethod
    def required_params(cls) -> bool:
        return True

    @classmethod
    def name(cls) -> str:
        return "ip_to_security_risk"

    @classmethod
    def category(cls) -> str:
        return "Ip"

    @classmethod
    def key(cls) -> str:
        return "address"

    @classmethod
    def documentation(cls) -> str:
        return """
## IP Security Risk Enricher

Performs a Shodan-backed security risk assessment on an IP address and scores
the result using a weighted model adapted from [RedFlag](https://github.com/adityaa206/redflag),
a cybersecurity M&A due-diligence tool.

### What it does
1. Looks up the IP in Shodan (`api.host()` — 1 credit per call).
2. Extracts open ports, service banners, CVE IDs, ASN, org, and geolocation.
3. Determines *exposure* (INTERNET_FACING vs UNKNOWN) from the service names
   on open ports.
4. Determines *exploit status* (PUBLIC_EXPLOIT vs UNKNOWN) from the presence
   of Shodan-linked CVEs.
5. Computes a **0–100 risk score** using the formula:

   ```
   score = (cvss_norm×0.35) + (exposure×0.25) + (sensitivity×0.25) + (exploit×0.15)
           × evidence_multiplier
   ```

6. Classifies the score into **critical / high / medium / low**.
7. Emits a `RiskProfile` node linked to the IP, plus a `Port` node for every
   open port Shodan reports.

### Required vault secret
| Key | Source |
|-----|--------|
| `SHODAN_API_KEY` | https://account.shodan.io |

### Scoring reference
| Factor | Value | Score |
|--------|-------|-------|
| Exposure | Internet-facing | 100 |
| Exposure | Unknown | 50 |
| Exploit | Public CVE | 65 |
| Exploit | Unknown | 30 |
| Evidence | Correlated (CVEs + port) | ×0.95 |
| Evidence | Inferred (host only) | ×0.85 |

### Graph output
```
(Ip) -[HAS_RISK_PROFILE]-> (RiskProfile)
(Ip) -[HAS_PORT]->         (Port)
```
        """

    # ------------------------------------------------------------------
    # Core enricher methods
    # ------------------------------------------------------------------

    async def scan(self, data: List[Ip]) -> List[RiskProfile]:
        results: List[RiskProfile] = []

        api_key = self.get_secret("SHODAN_API_KEY")
        if not api_key:
            Logger.error(
                self.sketch_id,
                {"message": "[SecurityRisk] SHODAN_API_KEY is not configured in the vault."},
            )
            return results

        # Import here so missing optional dep doesn't break the whole enricher package
        try:
            import shodan
        except ImportError:
            Logger.error(
                self.sketch_id,
                {"message": "[SecurityRisk] 'shodan' Python package is not installed. Run: pip install shodan"},
            )
            return results

        api = shodan.Shodan(api_key)

        for ip_obj in data:
            address = ip_obj.address
            Logger.info(
                self.sketch_id,
                {"message": f"[SecurityRisk] Querying Shodan for {address}…"},
            )
            try:
                host = api.host(address)
            except shodan.APIError as exc:
                Logger.warn(
                    self.sketch_id,
                    {"message": f"[SecurityRisk] Shodan lookup failed for {address}: {exc}"},
                )
                continue
            except Exception as exc:
                Logger.error(
                    self.sketch_id,
                    {"message": f"[SecurityRisk] Unexpected error for {address}: {exc}"},
                )
                continue

            risk_profile = self._build_risk_profile(address, host)
            results.append(risk_profile)

            Logger.info(
                self.sketch_id,
                {
                    "message": (
                        f"[SecurityRisk] {address} → score={risk_profile.overall_risk_score}, "
                        f"level={risk_profile.risk_level}, "
                        f"ports={len(getattr(risk_profile, '_shodan_ports', []))}"
                    )
                },
            )

        return results

    def postprocess(
        self, results: List[RiskProfile], input_data: List[Ip] = None
    ) -> List[RiskProfile]:
        if not self._graph_service or not results:
            return results

        ip_map: Dict[str, Ip] = {}
        if input_data:
            for ip_obj in input_data:
                ip_map[ip_obj.address] = ip_obj

        for profile in results:
            ip_address: str = profile.entity_id
            ip_obj = ip_map.get(ip_address, Ip(address=ip_address))

            # Persist IP and RiskProfile nodes
            self.create_node(ip_obj)
            self.create_node(profile)
            self.create_relationship(ip_obj, profile, "HAS_RISK_PROFILE")
            self.log_graph_message(
                f"[SecurityRisk] {ip_address}: risk={profile.risk_level} "
                f"({profile.overall_risk_score}/100)"
            )

            # Persist Port nodes from stored Shodan data
            shodan_ports: List[Dict[str, Any]] = getattr(profile, "_shodan_ports", [])
            for port_data in shodan_ports:
                try:
                    port_node = Port(
                        number=port_data["number"],
                        protocol=port_data.get("protocol", "tcp").upper(),
                        state="open",
                        service=port_data.get("service"),
                        banner=port_data.get("banner"),
                    )
                    self.create_node(port_node)
                    self.create_relationship(ip_obj, port_node, "HAS_PORT")
                except Exception as exc:
                    Logger.warn(
                        self.sketch_id,
                        {"message": f"[SecurityRisk] Could not create Port node {port_data}: {exc}"},
                    )

            # Clean up temporary attribute
            if hasattr(profile, "_shodan_ports"):
                try:
                    delattr(profile, "_shodan_ports")
                except Exception:
                    pass

        return results

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_risk_profile(self, address: str, host: Dict[str, Any]) -> RiskProfile:
        """Parse a raw Shodan host response into a scored RiskProfile."""

        # ── Collect open ports ────────────────────────────────────────
        shodan_ports: List[Dict[str, Any]] = []
        service_names: set = set()

        for banner in host.get("data", []):
            port_num = banner.get("port")
            if port_num is None:
                continue
            transport = banner.get("transport", "tcp")
            product = banner.get("product", "")
            svc = (banner.get("_shodan", {}).get("module", "") or product or "").lower()
            raw_banner = banner.get("data", "").strip()[:200]  # cap banner length

            shodan_ports.append(
                {
                    "number": port_num,
                    "protocol": transport,
                    "service": svc or None,
                    "banner": raw_banner or None,
                }
            )
            if svc:
                service_names.add(svc)

        # Fallback: use numeric port list when no banner data
        if not shodan_ports:
            for p in host.get("ports", []):
                shodan_ports.append({"number": p, "protocol": "tcp", "service": None, "banner": None})

        # ── CVEs ──────────────────────────────────────────────────────
        raw_vulns: Dict[str, Any] = host.get("vulns", {})
        cve_ids: List[str] = sorted(raw_vulns.keys())
        max_cvss = 0.0
        for cve_id, cve_meta in raw_vulns.items():
            cvss = cve_meta.get("cvss", 0.0) or 0.0
            if cvss > max_cvss:
                max_cvss = float(cvss)

        # Floor CVSS at 6.5 when CVEs are present (matches RedFlag's Shodan enricher)
        if cve_ids and max_cvss < 6.5:
            max_cvss = 6.5

        # ── Exposure ──────────────────────────────────────────────────
        open_port_numbers = {p["number"] for p in shodan_ports}
        is_internet_facing = bool(service_names & _INTERNET_FACING_SERVICES) or bool(
            open_port_numbers & {21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 6379, 8080, 8443, 9200, 27017}
        )
        exposure = "internet_facing" if is_internet_facing else "unknown"

        # ── Exploit / evidence ────────────────────────────────────────
        if cve_ids:
            exploit_status = "public_exploit"
            evidence = "correlated"
        else:
            exploit_status = "unknown"
            evidence = "inferred" if shodan_ports else "unknown"

        # ── Risk score ────────────────────────────────────────────────
        risk_score = _compute_risk_score(max_cvss, exposure, exploit_status, evidence)
        level = _risk_level(risk_score)

        # ── Risk factors (human-readable) ─────────────────────────────
        risk_factors: List[str] = []
        if is_internet_facing:
            risk_factors.append(f"Internet-facing ({len(open_port_numbers)} open ports)")
        if cve_ids:
            risk_factors.append(f"{len(cve_ids)} CVE(s) linked by Shodan (max CVSS {max_cvss})")
        if max_cvss >= 9.0:
            risk_factors.append("Critical-severity CVE (CVSS ≥ 9.0)")
        if 3389 in open_port_numbers:
            risk_factors.append("RDP exposed (port 3389)")
        if 22 in open_port_numbers:
            risk_factors.append("SSH exposed (port 22)")
        if open_port_numbers & {3306, 5432, 27017, 6379, 9200}:
            risk_factors.append("Database port(s) exposed to internet")

        # ── Mitigation recommendations ────────────────────────────────
        mitigations: List[str] = []
        if 3389 in open_port_numbers:
            mitigations.append("Restrict RDP (3389) to VPN or specific IP ranges")
        if 22 in open_port_numbers:
            mitigations.append("Disable password auth on SSH; use key-based auth")
        if open_port_numbers & {3306, 5432, 27017, 6379, 9200}:
            mitigations.append("Place databases behind firewall; never expose directly to internet")
        if cve_ids:
            mitigations.append(f"Patch or mitigate: {', '.join(cve_ids[:5])}")
        if not mitigations:
            mitigations.append("Conduct periodic attack-surface review")

        # ── Compliance risks ──────────────────────────────────────────
        compliance_risks: List[str] = []
        if cve_ids and max_cvss >= 7.0:
            compliance_risks.append("Unpatched high-severity CVEs may violate PCI-DSS §6.3.3 / ISO 27001 A.12.6.1")
        if open_port_numbers & {3306, 5432, 27017}:
            compliance_risks.append("Internet-exposed database ports may breach GDPR data-protection obligations")

        # ── Metadata from Shodan ──────────────────────────────────────
        org = host.get("org") or host.get("isp")
        asn = host.get("asn")
        country = host.get("country_name")
        city = host.get("city")
        hostnames = host.get("hostnames", [])
        domains = host.get("domains", [])

        exposure_surface_parts = []
        if org:
            exposure_surface_parts.append(f"Org: {org}")
        if asn:
            exposure_surface_parts.append(f"ASN: {asn}")
        if country:
            location = f"{city}, {country}" if city else country
            exposure_surface_parts.append(f"Location: {location}")
        if hostnames:
            exposure_surface_parts.append(f"Hostnames: {', '.join(hostnames[:3])}")
        if domains:
            exposure_surface_parts.append(f"Domains: {', '.join(domains[:3])}")
        if open_port_numbers:
            exposure_surface_parts.append(f"Open ports: {', '.join(str(p) for p in sorted(open_port_numbers))}")

        exposure_surface = " | ".join(exposure_surface_parts) if exposure_surface_parts else None

        attack_vectors: List[str] = []
        if cve_ids:
            attack_vectors.append("Known CVE exploitation")
        if is_internet_facing:
            attack_vectors.append("Direct internet attack surface")
        if open_port_numbers & {21, 23}:
            attack_vectors.append("Cleartext protocol interception (FTP/Telnet)")
        if 445 in open_port_numbers:
            attack_vectors.append("SMB/ransomware lateral movement")

        now_iso = datetime.datetime.utcnow().isoformat() + "Z"

        profile = RiskProfile(
            entity_id=address,
            entity_type="IP",
            overall_risk_score=risk_score,
            risk_level=level,
            assessment_date=now_iso,
            last_updated=now_iso,
            risk_factors=risk_factors or None,
            attack_vectors=attack_vectors or None,
            vulnerabilities=cve_ids or None,
            exposure_surface=exposure_surface,
            compliance_risks=compliance_risks or None,
            mitigation_strategies=mitigations or None,
            source="Shodan",
            confidence=0.85 if cve_ids else 0.70,
        )

        # Stash port data for postprocess (temp attribute, not a Pydantic field)
        object.__setattr__(profile, "_shodan_ports", shodan_ports)

        return profile


# Make types available at module level
InputType = IpToSecurityRisk.InputType
OutputType = IpToSecurityRisk.OutputType
