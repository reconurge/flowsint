import json
import socket
import subprocess
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.organization import Organization
from app.types.asn import ASN
from app.utils import resolve_type
from app.core.logger import Logger

InputType: TypeAlias = List[Organization]
OutputType: TypeAlias = List[ASN]

class OrgToAsnScanner(Scanner):
    """Takes an organization and returns its corresponding ASN."""

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
            org_obj = None
            if isinstance(item, str):
                org_obj = Organization(name=item)
            elif isinstance(item, dict) and "name" in item:
                org_obj = Organization(name=item["name"])
            elif isinstance(item, Organization):
                org_obj = item
            if org_obj:
                cleaned.append(org_obj)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        """Find ASN information for organizations using asnmap."""
        asns: OutputType = []

        for org in data:
            asn_data = self.__get_asn_from_asnmap(org.name)
            if asn_data:
                Logger.info(self.sketch_id, f"ASN {asn_data['as_number']} found for org {org.name}.")
                asns.append(ASN(
                    number=int(asn_data["as_number"].lstrip("AS")),
                    name=asn_data["as_name"],
                    country=asn_data["as_country"],
                    cidrs=[]
                ))
            else:
                Logger.info(self.sketch_id, f"No ASN found for org {org.name}")
        return asns
    
    def __get_asn_from_asnmap(self, name: str) -> Dict[str, Any]:
        try:
            # Properly run the shell pipeline using shell=True
            command = f"echo {name} | asnmap -silent -json | jq"
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True, text=True, timeout=60
            )
            if not result.stdout.strip():
                Logger.info(self.sketch_id, f"No ASN found for {name}.")
                return None
            try:
                # Parse the JSON array
                data_array = json.loads(result.stdout)
                if not data_array:
                    return None

                combined_data = {
                    "as_range": [],
                    "as_name": None,
                    "as_country": None,
                    "as_number": None
                }

                for data in data_array:
                    if "as_range" in data:
                        combined_data["as_range"].extend(data["as_range"])
                    if data.get("as_name") and not combined_data["as_name"]:
                        combined_data["as_name"] = data["as_name"]
                    if data.get("as_country") and not combined_data["as_country"]:
                        combined_data["as_country"] = data["as_country"]
                    if data.get("as_number") and not combined_data["as_number"]:
                        combined_data["as_number"] = data["as_number"]

                return combined_data if combined_data["as_number"] else None

            except json.JSONDecodeError:
                Logger.error(self.sketch_id, f"Failed to parse JSON from asnmap output: {result.stdout}")
                return None

        except Exception as e:
            Logger.error(self.sketch_id, f"asnmap exception for {name}: {str(e)}")
            return None

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between organizations and their corresponding ASNs
        Logger.info(self.sketch_id, f"Postprocessing {len(results)} ASNs for {len(original_input)} organizations")
        Logger.info(self.sketch_id, f"RESULTS for ORGTOASN {str(results)}")
        for input_org, result_asn in zip(original_input, results):
            # Skip if no valid ASN was found
            if result_asn.number == 0:
                continue
                
            query = """
            MERGE (org:organization {name: $org_name})
            SET org.sketch_id = $sketch_id,
                org.label = $org_name,
                org.caption = $org_name,
                org.type = "organization"
            
            MERGE (asn:asn {number: $asn_number})
            SET asn.sketch_id = $sketch_id,
                asn.name = $asn_name,
                asn.country = $asn_country,
                asn.label = $asn_label,
                asn.caption = $asn_caption,
                asn.type = "asn"
            
            MERGE (org)-[:BELONGS_TO {sketch_id: $sketch_id}]->(asn)
            """
            
            if self.neo4j_conn:
                self.neo4j_conn.query(query, {
                    "org_name": input_org.name,
                    "asn_number": result_asn.number,
                    "asn_name": result_asn.name,
                    "asn_country": result_asn.country,
                    "asn_label": f"AS{result_asn.number}",
                    "asn_caption": f"AS{result_asn.number} - {result_asn.name}",
                    "sketch_id": self.sketch_id,
                })

        return results