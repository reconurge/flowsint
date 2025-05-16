import socket
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.domain import MinimalDomain
from app.types.ip import MinimalIp
from app.utils import is_valid_domain, resolve_type
from app.core.logger import logger

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
        results: OutputType = []
        for d in data:
            try:
                ip = socket.gethostbyname(d.domain)
                results.append(MinimalIp(address=ip))
            except Exception as e:
                print(f"Error resolving {d.domain}: {e}")
        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for domain_obj, ip_obj in zip(original_input, results):
            logger.info(self.scan_id, self.sketch_id, f"{domain_obj.domain} -> {ip_obj.address}.")
            query = """
            MERGE (d:domain {domain: $domain})
            SET d.sketch_id = $sketch_id
            MERGE (ip:ip {address: $ip})
            SET ip.sketch_id = $sketch_id
            SET ip.label = $label
            SET ip.caption = $caption
            SET ip.type = $type
            MERGE (d)-[:RESOLVES_TO {sketch_id: $sketch_id}]->(ip)
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