import requests
from typing import List, Dict, Any, TypeAlias, Union
from app.scanners.base import Scanner
from app.types.domain import MinimalDomain, Domain
from app.utils import is_valid_domain, resolve_type
from pydantic import TypeAdapter

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
        schema = [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["MinimalDomain"]["properties"].items()
            ]
        return schema

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
        schema = [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["Domain"]["properties"].items()
            ]
        return schema

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
        """Find subdomains using crt.sh."""
        domains : OutputType = []
        for md in data:
            found_subdomains: set[str] = set()
            try:
                d = Domain(domain = md.domain)
                response = requests.get(
                    f"https://crt.sh/?q=%25.{d.domain}&output=json",
                    timeout=60
                )
                if response.ok:
                    entries = response.json()
                    
                    for entry in entries:
                        name_value = entry.get("name_value", "")
                        for subdomain in name_value.split("\n"):
                            if is_valid_domain(subdomain) and subdomain.endswith(d.domain):
                                found_subdomains.add(subdomain.lower())
                
            except Exception:
                continue
            d.subdomains = list(sorted(found_subdomains))
            domains.append(d)

        return domains

    def postprocess(self, results: OutputType) -> OutputType:
        return results
