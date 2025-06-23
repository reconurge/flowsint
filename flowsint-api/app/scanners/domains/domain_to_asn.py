import json
import socket
import subprocess
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.cidr import CIDR
from app.types.domain import Domain
from app.types.asn import ASN
from app.utils import is_valid_domain, resolve_type
from app.core.logger import Logger

InputType: TypeAlias = List[Domain]
OutputType: TypeAlias = List[ASN]

class DomainToAsnScanner(Scanner):
    """Takes a domain and returns its corresponding ASN."""

    @classmethod
    def name(cls) -> str:
        return "domain_to_asn_scanner"

    @classmethod
    def category(cls) -> str:
        return "Domain"
    
    @classmethod
    def key(cls) -> str:
        return "Domain"

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
                domain_obj = Domain(domain=item)
            elif isinstance(item, dict) and "domain" in item:
                domain_obj = Domain(domain=item["domain"])
            elif isinstance(item, Domain):
                domain_obj = item
            if domain_obj and is_valid_domain(domain_obj.domain):
                cleaned.append(domain_obj)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        """Find ASN information for domain name using asnmap."""
        asns: OutputType = []
        for domain in data:
            asn_data = self.__get_asn_from_asnmap(domain.domain)
            if asn_data:
                Logger.info(self.sketch_id, {"message": f"Domain {domain.domain} has ASN {asn_data['as_number']}."})
                asns.append(ASN(
                    number=int(asn_data["as_number"].lstrip("AS")),
                    name=asn_data["as_name"],
                    country=asn_data["as_country"],
                    cidrs=[CIDR(network=cidr) for cidr in asn_data["as_range"]]
                ))
            else:
                Logger.info(self.sketch_id, {"message": f"No ASN found for domain {domain.domain}"})
        return asns
    
    def __get_asn_from_asnmap(self, domain: str) -> Dict[str, Any]:
        try:
            command = f"echo {domain} | asnmap -silent -json | jq"
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True, text=True, timeout=60
            )
            if not result.stdout.strip():
                return None
            return json.loads(result.stdout)
        except Exception as e:
            Logger.error(self.sketch_id, {"message": f"asnmap exception for {domain}: {str(e)}"})
            return None

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between domain and their corresponding ASNs
        for input_ip, result_asn in zip(original_input, results):
            # Skip if no valid ASN was found
            if result_asn.number == 0:
                continue
            Logger.graph_append(self.sketch_id, {"message": f"Domain {input_ip.domain} -> ASN {result_asn.number}"})
                
            query = """
            MERGE (domain:domain {domain: $domain})
            SET domain.sketch_id = $sketch_id,
                domain.label = $domain,
                domain.type = "domain"
            
            MERGE (asn:asn {number: $asn_number})
            SET asn.sketch_id = $sketch_id,
                asn.name = $asn_name,
                asn.country = $asn_country,
                asn.label = $asn_label,
                asn.type = "asn"
            
            MERGE (domain)-[:BELONGS_TO {sketch_id: $sketch_id}]->(asn)
            """
            
            if self.neo4j_conn:
                self.neo4j_conn.query(query, {
                    "domain": input_ip.domain,
                    "asn_number": result_asn.number,
                    "asn_name": result_asn.name,
                    "asn_country": result_asn.country,
                    "asn_label": f"AS{result_asn.number}",
                    "asn_caption": f"AS{result_asn.number} - {result_asn.name}",
                    "sketch_id": self.sketch_id,
                })

        return results