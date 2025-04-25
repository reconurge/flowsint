import socket
from typing import List, Dict, Any, TypeAlias
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.domain import MinimalDomain
from app.types.ip import MinimalIp
from app.utils import resolve_type

InputType: TypeAlias = List[MinimalIp]
OutputType: TypeAlias =List[MinimalDomain]

class ReverseResolveScanner(Scanner):
    """Resolve IP addresses to domain names."""

    @classmethod
    def name(cls) -> str:
        return "ip_reverse_resolve_scanner"

    @classmethod
    def category(cls) -> str:
        return "ips"

    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(InputType)
        return [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["MinimalIp"]["properties"].items()
        ]

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
        return [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["MinimalDomain"]["properties"].items()
        ]

    def preprocess(self, data: InputType) -> InputType:
        return [ip for ip in data if ip.ip]

    def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for ip in data:
            try:
                domain = socket.gethostbyaddr(ip.ip)[0]
                results.append(MinimalDomain(domain=domain))
            except Exception as e:
                print(f"Error reverse resolving {ip.ip}: {e}")
        return results

    def postprocess(self, results: OutputType) -> OutputType:
        return results
