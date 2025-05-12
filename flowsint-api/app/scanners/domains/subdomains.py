import requests
import subprocess
from typing import List, Dict, Any, TypeAlias, Union
from app.scanners.base import Scanner
from app.types.domain import MinimalDomain, Domain
from app.utils import is_valid_domain, resolve_type
from pydantic import TypeAdapter
from app.core.logger import logger

InputType: TypeAlias = List[MinimalDomain]
OutputType: TypeAlias = List[Domain]

class SubdomainScanner(Scanner):
    """Scanner to find subdomains associated to a domain."""

    @classmethod
    def name(cls) -> str:
        return "domain_subdomains_scanner"

    @classmethod
    def category(cls) -> str:
        return "domains"

    @classmethod
    def key(cls) -> str:
        return "subdomains"
    
    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(InputType)
        return [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["MinimalDomain"]["properties"].items()
        ]

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
        return [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["Domain"]["properties"].items()
        ]

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            domain_obj = None
            if isinstance(item, str):
                domain_obj = MinimalDomain(domain=item)
            elif isinstance(item, dict) and "domain" in item:
                domain_obj = MinimalDomain(domain=item["domain"])
            elif isinstance(item, MinimalDomain):
                domain_obj = item
            if domain_obj and is_valid_domain(domain_obj.domain) != "invalid":
                cleaned.append(domain_obj)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        """Find subdomains using crt.sh and subfinder."""
        domains: OutputType = []

        for md in data:
            d = Domain(domain=md.domain)
            subdomains = self.__get_subdomains_from_subfinder(d.domain)
            # subdomains.update(self.__get_subdomains_from_crtsh(d.domain))
            d.subdomains = sorted(subdomains)
            domains.append(d)

        return domains

    def __get_subdomains_from_crtsh(self, domain: str) -> set[str]:
        subdomains: set[str] = set()
        try:
            response = requests.get(
                f"https://crt.sh/?q=%25.{domain}&output=json",
                timeout=60
            )
            if response.ok:
                entries = response.json()
                for entry in entries:
                    name_value = entry.get("name_value", "")
                    for sub in name_value.split("\n"):
                        sub = sub.strip().lower()
                        if "*" not in sub and is_valid_domain(sub) and sub.endswith(domain) and sub != domain:
                            subdomains.add(sub)
                        elif "*" in sub:
                            print(f"[IGNORED] Wildcard subdomain: {repr(sub)}")
        except Exception as e:
            print(f"[ERROR] crt.sh failed for {domain}: {e}")
        return subdomains

    def __get_subdomains_from_subfinder(self, domain: str) -> set[str]:
        subdomains: set[str] = set()
        try:
            result = subprocess.run(
                ["subfinder", "-silent", "-d", domain],
                capture_output=True, text=True, timeout=60
            )
            if result.returncode == 0:
                for sub in result.stdout.strip().splitlines():
                    sub = sub.strip().lower()
                    if is_valid_domain(sub) and sub.endswith(domain) and sub != domain:
                        subdomains.add(sub)
            else:
                print(f"[ERROR] subfinder failed for {domain}: {result.stderr.strip()}")
        except Exception as e:
            print(f"[ERROR] subfinder exception for {domain}: {e}")
        return subdomains

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for domain_obj in results:
            if not self.neo4j_conn:
                continue
            for subdomain in domain_obj.subdomains:
                self.neo4j_conn.query("""
                    MERGE (sub:subdomain {domain: $subdomain})
                    SET sub.sketch_id = $sketch_id
                    SET sub.sketch_id = $sketch_id
                    SET sub.label = $label
                    SET sub.color = $color
                    SET sub.caption = $caption
                    SET sub.type = $type
                    MERGE (d:domain {domain: $domain})
                    MERGE (d)-[:HAS_SUBDOMAIN {sketch_id: $sketch_id}]->(sub)
                """, {
                    "domain": domain_obj.domain,
                    "subdomain": subdomain,
                    "sketch_id": self.sketch_id,
                    "label": subdomain,
                    "caption": subdomain,
                    "color": "#865FCD",
                    "type": "subdomain"
                })
            logger.info(self.scan_id, self.sketch_id, f"{domain_obj.domain} -> {len(domain_obj.subdomains)} subdomain(s) found.")


        return results
