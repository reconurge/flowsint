import shutil
import requests
import subprocess
from typing import List, Dict, Any, TypeAlias, Union
from app.scanners.base import Scanner
from app.types.domain import Domain, Domain
from app.utils import is_valid_domain, resolve_type
from pydantic import TypeAdapter
from app.core.logger import Logger

InputType: TypeAlias = List[Domain]
OutputType: TypeAlias = List[Domain]

class SubdomainScanner(Scanner):
    """Scanner to find subdomains associated with a domain."""

    @classmethod
    def name(cls) -> str:
        return "domain_subdomains_scanner"

    @classmethod
    def category(cls) -> str:
        return "Domain"

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
                {"name": prop, "type": resolve_type(info, schema)}
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
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in details["properties"].items()
            ]
        }


    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        invalid_items = []
        
        for i, item in enumerate(data):
            domain_obj = None
            if isinstance(item, str):
                domain_obj = Domain(domain=item)
            elif isinstance(item, dict) and "domain" in item:
                domain_obj = Domain(domain=item["domain"])
            elif isinstance(item, Domain):
                domain_obj = item
            else:
                invalid_items.append(f"Item at index {i}: {type(item).__name__} - {item}")
                continue
                
            if domain_obj and is_valid_domain(domain_obj.domain):
                cleaned.append(domain_obj)
            else:
                invalid_items.append(f"Item at index {i}: Invalid domain '{getattr(domain_obj, 'domain', item) if domain_obj else item}'")
        
        if invalid_items:
            error_msg = f"Invalid input format. The following items could not be processed:\n" + "\n".join(invalid_items)
            Logger.error(self.sketch_id, {"message":error_msg})
            raise ValueError(error_msg)
            
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        """Find subdomains using subfinder (if available) or fallback to crt.sh."""
        domains: OutputType = []
        use_subfinder = self.__is_subfinder_installed()

        for md in data:
            d = Domain(domain=md.domain)
            if use_subfinder:
                subdomains = self.__get_subdomains_from_subfinder(d.domain)
                if not subdomains:
                    Logger.warn(self.sketch_id, f"subfinder failed for {d.domain}, falling back to crt.sh")
                    subdomains = self.__get_subdomains_from_crtsh(d.domain)
            else:
                Logger.info(self.sketch_id, "subfinder not found, using crt.sh only")
                subdomains = self.__get_subdomains_from_crtsh(d.domain)

            domains.append({"domain": d.domain, "subdomains": sorted(subdomains)})

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
                            continue
        except Exception as e:
            Logger.error(self.sketch_id, f"crt.sh failed for {domain}: {e}")
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
                Logger.error(self.sketch_id, f"subfinder failed for {domain}: {result.stderr.strip()}")
        except Exception as e:
            Logger.error(self.sketch_id, f"subfinder exception for {domain}: {e}")
        return subdomains

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        output: OutputType = []
        for domain_obj in results:
            if not self.neo4j_conn:
                continue
            for subdomain in domain_obj["subdomains"]:
                output.append(Domain(domain=subdomain))
                Logger.info(self.sketch_id, {"message": f"{domain_obj['domain']} -> {subdomain}"})
                self.neo4j_conn.query("""
                    MERGE (sub:domain {domain: $subdomain})
                    SET sub.sketch_id = $sketch_id,
                        sub.label = $label,
                        sub.type = $type
                    MERGE (d:domain {domain: $domain})
                    MERGE (d)-[:HAS_SUBDOMAIN {sketch_id: $sketch_id}]->(sub)
                """, {
                    "domain": domain_obj["domain"],
                    "subdomain": subdomain,
                    "sketch_id": self.sketch_id,
                    "label": subdomain,
                    "type": "domain"
                })
            Logger.graph_append(self.sketch_id, {"message":f"{domain_obj['domain']} -> {len(domain_obj['subdomains'])} subdomain(s) found."})

        return output
