import json
import subprocess
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.cidr import CIDR
from app.types.ip import MinimalIp
from app.types.organization import MinimalOrganization
from app.types.asn import ASN
from app.utils import resolve_type

InputType: TypeAlias = List[MinimalOrganization]
OutputType: TypeAlias = List[ASN]

class OrgToAsnScanner(Scanner):
    """Takes an organization and returns the ASN(s) if any."""

    @classmethod
    def name(cls) -> str:
        return "org_to_asn_scanner"

    @classmethod
    def category(cls) -> str:
        return "organizations"
    
    @classmethod
    def key(cls) -> str:
        return "name"

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
            if isinstance(item, str):
                cleaned.append(MinimalOrganization(name=item))
            elif isinstance(item, dict) and "name" in item:
                cleaned.append(MinimalOrganization(**item))
            elif isinstance(item, MinimalOrganization):
                cleaned.append(item)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        """Find ASN information for organization name using asnmap."""
        asns: OutputType = []
        self.logger.debug(message=f"[ASN_SCANNER]: input data: {str(data)}")

        for org in data:
            asn_data = self.__get_asn_from_asnmap(org.name)
            if asn_data:
                self.logger.info(message=f"ASN {asn_data['as_number']} found for org {org.name}.")
                asns.append(ASN(
                    number=int(asn_data["as_number"].lstrip("AS")),
                    name=asn_data["as_name"],
                    country=asn_data["as_country"],
                    cidrs=[CIDR(network=cidr) for cidr in asn_data["as_range"]]
                ))
            else:
                self.logger.info(f"No ASN found for org {org.name}")
        return asns
    
    def __get_asn_from_asnmap(self, name: str) -> Dict[str, Any]:
        try:
            # Properly run the shell pipeline using shell=True
            command = f"echo '{name}' | asnmap -silent -json | jq"
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True, text=True, timeout=60
            )
            if not result.stdout.strip():
                self.logger.info(f"No ASN found for {name}.")
                return None
            return json.loads(result.stdout)
        except Exception as e:
            self.logger.error(message=f"asnmap exception for {name}: {str(e)}")
            return None

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between organizations and their corresponding ASNs
        for org, asn in zip(original_input, results):
            if asn.number == 0:
                continue
            if self.neo4j_conn:
                query = """
                MERGE (org:Organization {name: $org_name})
                SET org.sketch_id = $sketch_id,
                    org.label = $org_name,
                    org.caption = $org_name,
                    org.type = "organization"
                
                MERGE (asn:ASN {number: $asn_number})
                SET asn.sketch_id = $sketch_id,
                    asn.name = $asn_name,
                    asn.country = $asn_country,
                    asn.label = $asn_label,
                    asn.caption = $asn_caption,
                    asn.type = "asn"
                
                MERGE (org)-[:OWNS {sketch_id: $sketch_id}]->(asn)
                """
                self.neo4j_conn.query(query, {
                    "org_name": org.name,
                    "asn_number": asn.number,
                    "asn_name": asn.name,
                    "asn_country": asn.country,
                    "asn_label": f"AS{asn.number}",
                    "asn_caption": f"AS{asn.number} - {asn.name}",
                    "sketch_id": self.sketch_id,
                })
        return results