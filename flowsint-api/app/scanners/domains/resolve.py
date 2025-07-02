import socket
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.domain import Domain
from app.types.ip import Ip
from app.utils import is_valid_domain, resolve_type, is_root_domain
import uuid
from app.types.transform import Node, Edge
from app.core.logger import Logger

InputType: TypeAlias = List[Domain]
OutputType: TypeAlias = List[Ip]

class ResolveScanner(Scanner):
    """Resolve domain names to IP addresses."""

    @classmethod
    def name(cls) -> str:
        return "domain_resolve_scanner"

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
        for item in data:
            domain_obj = None
            if isinstance(item, str):
                domain_obj = Domain(domain=item, root=is_root_domain(item))
            elif isinstance(item, dict) and "domain" in item:
                domain_obj = Domain(domain=item["domain"], root=is_root_domain(item["domain"]))
            elif isinstance(item, Domain):
                # If the Domain object already exists, update its root field
                domain_obj = Domain(domain=item.domain, root=is_root_domain(item.domain))
            if domain_obj and is_valid_domain(domain_obj.domain):
                cleaned.append(domain_obj)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for d in data:
            try:
                ip = socket.gethostbyname(d.domain)
                results.append(Ip(address=ip))
            except Exception as e:
                print(f"Error resolving {d.domain}: {e}")
        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for domain_obj, ip_obj in zip(original_input, results):
            query = """
            MERGE (d:domain {domain: $domain})
            SET d.sketch_id = $sketch_id,
                d.label = $domain,
                d.type = $type
            MERGE (ip:ip {address: $ip})
            SET ip.sketch_id = $sketch_id,
                ip.label = $label,
                ip.type = "ip"
            MERGE (d)-[:RESOLVES_TO {sketch_id: $sketch_id}]->(ip)
            """
            if self.neo4j_conn:
                self.neo4j_conn.query(query, {
                    "domain": domain_obj.domain,
                    "ip": ip_obj.address,
                    "sketch_id": self.sketch_id,
                    "label": ip_obj.address,
                    "type": "domain" if domain_obj.root else "subdomain"
                })
            nodes = [Node(
                id=str(uuid.uuid4()),
                data={
                    "label": ip_obj.address,
                    "type": "ip"
                },
                position={
                    "x": 0,
                    "y": 0,
                },
                type="ip"
            )]
            edges =[Edge(
                id=str(uuid.uuid4()),
                source="",
                target="",
                data={
                    "label": "RESOLVES_TO",
                },
            )]
            nodes=[node.model_dump_json() for node in nodes]
            edges=[edge.model_dump_json() for edge in edges]
            payload:Dict = {
                "message": f"IP found for domain {domain_obj.domain} -> {ip_obj.address}"
                # "nodes": nodes,
                # "edges": edges
                }
            Logger.graph_append(self.sketch_id, payload)


        return results