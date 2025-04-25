import requests
from typing import List, Dict, Any, TypeAlias
from app.scanners.base import Scanner
from app.types.domain import MinimalDomain
from app.utils import is_valid_domain, resolve_type
from pydantic import TypeAdapter

InputType: TypeAlias = List[MinimalDomain]
OutputType: TypeAlias = List[MinimalDomain]

class SubdomainScanner(Scanner):
    """Scanner to find subdomains associated to a domain."""

    @classmethod
    def name(cls) -> str:
        return "subdomain_scanner"

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
            for prop, details in adapter.json_schema()["$defs"]["MinimalDomain"]["properties"].items()
            ]
        return schema

    def preprocess(self, data: InputType) -> InputType:
        """Filter out invalid domains."""
        return[d for d in data if is_valid_domain(d.domain) != "invalid"]

    def scan(self, data: InputType) -> OutputType:
        """Find subdomains using crt.sh."""

        found_subdomains: set[str] = set()

        for d in data:
            try:
                response = requests.get(
                    f"https://crt.sh/?q=%25.{d.domain}&output=json",
                    timeout=10
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

        return [MinimalDomain(domain=sub) for sub in sorted(found_subdomains)]

    def postprocess(self, results: OutputType) -> OutputType:
        return results
