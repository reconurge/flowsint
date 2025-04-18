import json
import uuid
from typing import Dict, Any, List
import requests
import whois
import pydig
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

        # WHOIS info (python-whois)
        try:
            w = whois.whois(clean_domain)
            result["whois_raw"] = str(w)
        except Exception as e:
            result["whois_raw"] = f"[error] {str(e)}"

        # DNS lookup (IP) via pydig
        try:
            ips = pydig.query(clean_domain, 'A')
            result["ips"] = ips
        except Exception as e:
            result["ips"] = []
            result["ips_error"] = f"[error] {str(e)}"

        # IP Geolocation info via ipinfo.io
        ipinfo_data = []
        for ip in result.get("ips", []):
            try:
                resp = requests.get(f"https://ipinfo.io/{ip}/json", timeout=10)
                ipinfo_data.append(resp.json())
            except Exception:
                ipinfo_data.append({"ip": ip, "error": "Failed to fetch ipinfo"})
        result["ipinfo"] = ipinfo_data

        # crt.sh subdomains
        try:
            result["subdomains"] = self._get_subdomains_from_crtsh(clean_domain)
        except Exception as e:
            result["subdomains"] = [f"[crt.sh] Error: {str(e)}"]

        return result

    def postprocess(self, results: Dict[str, Any]) -> Dict[str, Any]:
        results["scanner"] = "domain_infos_scanner"
        results["count_ips"] = len(results.get("ips", []))
        results["count_subdomains"] = len(results.get("subdomains", []))
        return results
