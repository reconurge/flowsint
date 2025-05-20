import re
import os
import socket
import dns.resolver
import requests
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.domain import MinimalDomain
from app.types.ip import MinimalIp
from app.utils import resolve_type, is_valid_ip

InputType: TypeAlias = List[MinimalIp]
OutputType: TypeAlias = List[MinimalDomain]

PTR_BLACKLIST = re.compile(r"^ip\d+\.ip-\d+-\d+-\d+-\d+\.")

class ReverseResolveScanner(Scanner):
    """Resolve IP addresses to domain names using PTR, Certificate Transparency and optional API calls."""

    @classmethod
    def name(cls) -> str:
        return "ip_reverse_resolve_scanner"

    @classmethod
    def category(cls) -> str:
        return "ips"

    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(InputType)
        schema = adapter.json_schema()
        type_name, details = list(schema["$defs"].items())[0]
        return {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info)}
                for prop, info in details["properties"].items()
            ]
        }

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
        schema = adapter.json_schema()
        type_name, details = list(schema["$defs"].items())[0]
        return {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info)}
                for prop, info in details["properties"].items()
            ]
        }

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            ip_obj = None
            if isinstance(item, str):
                ip_obj = MinimalIp(address=item)
            elif isinstance(item, dict) and "address" in item:
                ip_obj = MinimalIp(address=item["address"])
            elif isinstance(item, MinimalIp):
                ip_obj = item
            if ip_obj and is_valid_ip(ip_obj.address):
                cleaned.append(ip_obj)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for ip in data:
            try:
                domains = self.get_domains_from_ip(ip.address)
                for d in domains:
                    results.append(MinimalDomain(domain=d))
            except Exception as e:
                print(f"Error resolving {ip.address}: {e}")
        return results

    def postprocess(self, results: OutputType) -> OutputType:
        return results

    @classmethod
    def get_domains_from_ip(cls, address: str) -> List[str]:
        """
        1) Attempt PTR lookup and filter generic provider names.
        2) Query crt.sh for certificates matching the IP SAN/CN.
        3) (Optional) Query a Reverse-IP API if API key is set.
        Returns a unique, sorted list of candidate domains.
        """
        candidates: List[str] = []

        try:
            answers = dns.resolver.resolve_address(address)
            ptr = answers[0].to_text().rstrip('.')
            if not PTR_BLACKLIST.match(ptr):
                candidates.append(ptr)
        except Exception:
            pass

        # 2. Certificate Transparency via crt.sh
        try:
            url = f"https://crt.sh/?q=%25.{address}&output=json"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            entries = resp.json()
            for entry in entries:
                names = entry.get("name_value", "").split("\n")
                for name in names:
                    # skip wildcards and pure IPs
                    name = name.strip().lower()
                    if name.startswith("*."):
                        name = name[2:]
                    if name and not re.match(r"^\d+\.\d+\.\d+\.\d+$", name):
                        candidates.append(name)
        except Exception:
            pass

        # 3. Reverse-IP API (e.g., SecurityTrails)
        api_key = os.getenv("REVERSE_IP_API_KEY")
        if api_key:
            try:
                headers = {"APIKEY": api_key}
                # Example endpoint; replace with your provider's
                api_url = f"https://api.securitytrails.com/v1/ips/hostname/{address}"
                r = requests.get(api_url, headers=headers, timeout=10)
                r.raise_for_status()
                hosts = r.json().get("hostnames", [])
                candidates.extend(hosts)
            except Exception:
                pass

        # Deduplicate and clean
        unique = []
        for c in candidates:
            c = c.lower().rstrip('.')
            if c not in unique:
                unique.append(c)

        return unique

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for domain_obj, ip_obj in zip(original_input, results):
            self.logger.success(self.scan_id, self.sketch_id, f"Resolved {ip_obj.address} to {domain_obj.domain}")
            query = """
            MERGE (d:ip {ip: $ip})
            SET d.sketch_id = $sketch_id
            MERGE (domain:domain {domain: $domain})
            SET ip.sketch_id = $sketch_id
            SET ip.label = $label
            SET ip.caption = $caption
            SET ip.type = $type
            MERGE (ip)-[:REVERSE_RESOLVES_TO {sketch_id: $sketch_id}]->(d)
            """
            if self.neo4j_conn:
                self.neo4j_conn.query(query, {
                    "domain": domain_obj.domain,
                    "ip": ip_obj.address,
                    "sketch_id": self.sketch_id,
                    "label": ip_obj.address,
                    "caption": ip_obj.address,
                    "type": "ip"
                })

        return results