import socket
from typing import List, Dict, Any, TypeAlias
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.domain import MinimalDomain
from app.types.ip import MinimalIp
from app.utils import is_valid_domain, resolve_type

InputType: TypeAlias = List[MinimalDomain]
OutputType: TypeAlias = List[MinimalIp]

class ResolveScanner(Scanner):
    """Resolve domain names to IP addresses."""

    @classmethod
    def name(cls) -> str:
        return "domain_resolve_scanner"

    @classmethod
    def category(cls) -> str:
        return "domains"

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
            for prop, details in adapter.json_schema()["$defs"]["MinimalIp"]["properties"].items()
        ]

    def preprocess(self, data: InputType) -> InputType:
        return [d for d in data if is_valid_domain(d.domain) != "invalid"]

    def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for d in data:
            try:
                ip = socket.gethostbyname(d.domain)
                results.append(MinimalIp(ip=ip))
            except Exception as e:
                print(f"Error resolving {d.domain}: {e}")
        return results

    def postprocess(self, results: OutputType) -> OutputType:
        return results
