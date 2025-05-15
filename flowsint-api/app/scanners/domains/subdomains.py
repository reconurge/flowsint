import shutil
import requests
import subprocess
from typing import List, Dict, Any, TypeAlias, Union
from app.scanners.base import Scanner
from app.types.domain import MinimalDomain, Domain
from app.utils import is_valid_domain, resolve_type
from pydantic import TypeAdapter
from app.core.logger import logger

InputType: TypeAlias = List[MinimalDomain]
OutputType: TypeAlias = List[MinimalDomain]

class SubdomainScanner(Scanner):
    """Scanner to find subdomains associated with a domain."""

    @classmethod
    def name(cls) -> str:
        return "domain_subdomains_scanner"

    @classmethod
    def category(cls) -> str:
        return "domains"

    @classmethod
    def key(cls) -> str:
        return "domain"

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
        logger.debug(self.scan_id, self.sketch_id,f"[SUBDOMAIN_SCANNER]: preprocessed: {str(data)}")
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
        logger.debug(self.scan_id, self.sketch_id,f"[SUBDOMAIN_SCANNER]: postprocessed: {str(cleaned)}")
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        """Find subdomains using subfinder (if available) or fallback to crt.sh."""
        domains: OutputType = []
        use_subfinder = self.__is_subfinder_installed()
        logger.debug(self.scan_id, self.sketch_id,f"[SUBDOMAIN_SCANNER]: input data: {str(data)}")

        for md in data:
            d = Domain(domain=md.domain)
            if use_subfinder:
                subdomains = self.__get_subdomains_from_subfinder(d.domain)
                if not subdomains:
                    logger.warning(self.scan_id, self.sketch_id, f"subfinder failed for {d.domain}, falling back to crt.sh")
                    subdomains = self.__get_subdomains_from_crtsh(d.domain)
            else:
                logger.info(self.scan_id, self.sketch_id, "subfinder not found, using crt.sh only")
                subdomains = self.__get_subdomains_from_crtsh(d.domain)

            d.subdomains = sorted(subdomains)
            domains.append(d)

        return domains

    def __is_subfinder_installed(self) -> bool:
        return shutil.which("subfinder") is not None

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
                            logger.debug(self.scan_id, self.sketch_id, f"Ignored wildcard subdomain: {sub}")
        except Exception as e:
            logger.error(self.scan_id, self.sketch_id, f"crt.sh failed for {domain}: {e}")
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
                    if is_valid_domain(sub) and sub.endswith(domain) and sub != domain and not sub.startswith("."):
                        subdomains.add(sub)
            else:
                logger.error(self.scan_id, self.sketch_id, f"subfinder failed for {domain}: {result.stderr.strip()}")
        except Exception as e:
            logger.error(self.scan_id, self.sketch_id, f"subfinder exception for {domain}: {e}")
        return subdomains

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        output: OutputType = []
        for domain_obj in results:
            if not self.neo4j_conn:
                continue
            for subdomain in domain_obj.subdomains:
                output.append(MinimalDomain(domain=subdomain))
                self.neo4j_conn.query("""
                    MERGE (sub:domain {domain: $subdomain})
                    SET sub.sketch_id = $sketch_id,
                        sub.label = $label,
                        sub.color = $color,
                        sub.caption = $caption,
                        sub.type = $type
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

        return output
