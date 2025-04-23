import json
import uuid
from typing import Dict, Any, List
import requests
import whois
import pydig
from app.utils import is_valid_url
from app.scanners.base import Scanner


class DomainInfosScanner(Scanner):
    """Scan for WHOIS, DNS, subdomains, and geolocation data of a domain."""

    @classmethod
    def name(cls) -> str:
        return "domain_infos_scanner"

    @classmethod
    def category(cls) -> str:
        return "websites"

    @classmethod
    def key(cls) -> str:
        return "url"

    @classmethod
    def input_schema(cls) -> Dict[str, str]:
        """Defines expected input format."""
        return {
            "domains": "array"
        }

    @classmethod
    def output_schema(self) -> Dict[str, str]:
        """Defines the structure of the data returned by the scan."""
        return {
            "output": "dict",  # A list of results for each username scan
        }

    def _get_subdomains_from_crtsh(self, domain: str) -> List[str]:
        url = f"https://crt.sh/?q=%25.{domain}&output=json"
        try:
            resp = requests.get(url, timeout=100)
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
        
    def preprocess(self, domains: List[str]) -> List[str]:
        """Preprocess the domains by validating them."""
        return [is_valid_url(domain) for domain in domains]

    def scan(self, domains: List[str]) -> List[Dict[str, Any]]:
        """Scan multiple domains and return a list of results."""
        results = []
        for domain in domains:
            result = {"domain": domain }
            # WHOIS info
            try:
                w = whois.whois(domain)
                result["whois_raw"] = json.dumps(w, default=str, indent=2)
            except Exception as e:
                result["whois_raw"] = json.dumps({"error": str(e)})

            # DNS lookup
            try:
                result["ips"] = pydig.query(domain, 'A')
            except Exception as e:
                result["ips"] = []
                result["ips_error"] = f"[error] {str(e)}"

            # IP Geolocation
            ipinfo_data = []
            for ip in result.get("ips", []):
                try:
                    resp = requests.get(f"https://ipinfo.io/{ip}/json", timeout=10)
                    ipinfo_data.append(resp.json())
                except Exception:
                    ipinfo_data.append({"ip": ip, "error": "Failed to fetch ipinfo"})
            result["ipinfo"] = ipinfo_data
            # Subdomains
            result["subdomains"] = self._get_subdomains_from_crtsh(domain)

            results.append(result)

        return results

    def postprocess(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Post-process the results by adding additional information."""
        return {"output": {"domains": results}}
