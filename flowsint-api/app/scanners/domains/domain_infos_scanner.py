import json
import subprocess
import uuid
from typing import Dict, Any, List
from pathlib import Path

import requests

from app.utils import extract_domain
from app.scanners.base import Scanner

class DomainInfosScanner(Scanner):
    """Scan for subdomains via crt.sh and certificate transparency logs."""

    @property
    def name(self) -> str:
        return "domain_infos_scanner"

    def _get_subdomains_from_crtsh(self, domain: str) -> List[str]:
        url = f"https://crt.sh/?q=%25.{domain}&output=json"
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code != 200:
                return []

            data = resp.json()
            subdomains = set()

            for entry in data:
                name = entry.get("name_value")
                if name:
                    for sub in name.splitlines():
                        sub = sub.strip().lower().lstrip('*.')
                        if sub.endswith(domain):
                            subdomains.add(sub)

            return sorted(subdomains)
        except Exception as e:
            return [f"[crt.sh] Error: {str(e)}"]

    def scan(self, domain: str) -> Dict[str, Any]:
        report_id = str(uuid.uuid4())
        clean_domain = extract_domain(domain)
        result = {"domain": clean_domain, "report_id": report_id}

        try:
            # WHOIS info
            whois_output = subprocess.run(
                ["whois", clean_domain],
                capture_output=True,
                text=True,
                timeout=30
            )
            result["whois_raw"] = whois_output.stdout.strip()

            # DNS lookup (IP)
            dig_output = subprocess.run(
                ["dig", "+short", clean_domain],
                capture_output=True,
                text=True,
                timeout=10
            )
            ips = [line.strip() for line in dig_output.stdout.strip().split("\n") if line.strip()]
            result["ips"] = ips

            # IP Geolocation info via ipinfo.io
            ipinfo_data = []
            for ip in ips:
                ipinfo_output = subprocess.run(
                    ["curl", f"https://ipinfo.io/{ip}/json"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                try:
                    ipinfo_data.append(json.loads(ipinfo_output.stdout))
                except Exception:
                    ipinfo_data.append({"ip": ip, "error": "Failed to parse ipinfo response"})

            result["ipinfo"] = ipinfo_data

            # crt.sh subdomains
            result["subdomains"] = self._get_subdomains_from_crtsh(clean_domain)

            return result

        except subprocess.TimeoutExpired:
            return {"error": "Domain scan timed out."}
        except Exception as e:
            return {"error": f"Unexpected error in Domain scan: {str(e)}"}

    def postprocess(self, results: Dict[str, Any]) -> Dict[str, Any]:
        results["scanner"] = "domain_infos_scanner"
        results["count_ips"] = len(results.get("ips", []))
        results["count_subdomains"] = len(results.get("subdomains", []))
        return results
