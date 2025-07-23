import json
import socket
import subprocess
from typing import List, Dict, Any, Union
from app.scanners.base import Scanner
from app.types.organization import Organization
from app.types.asn import ASN
from app.core.logger import Logger

class OrgToAsnScanner(Scanner):
    """Takes an organization and returns its corresponding ASN."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Organization]
    OutputType = List[ASN]

    @classmethod
    def name(cls) -> str:
        return "org_to_asn_scanner"

    @classmethod
    def category(cls) -> str:
        return "Organization"
    
    @classmethod
    def key(cls) -> str:
        return "name"

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

    async def scan(self, data: InputType) -> OutputType:
        """Find ASN information for organizations using asnmap."""
        asns: OutputType = []

        for org in data:
            asn_data = self.__get_asn_from_asnmap(org.name)
            if asn_data:
                asns.append(ASN(
                    number=int(asn_data["as_number"].lstrip("AS")),
                    name=asn_data["as_name"],
                    country=asn_data["as_country"],
                    cidrs=[]
                ))
            else:
                Logger.info(self.sketch_id, {"message": f"No ASN found for org {org.name}."})
        return asns
    
    def __get_asn_from_asnmap(self, name: str) -> Dict[str, Any]:
        try:
            # Properly run the shell pipeline using shell=True
            command = f"echo {name} | asnmap -silent -json | jq -s"
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True, text=True, timeout=60
            )
            if not result.stdout.strip():
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

            except json.JSONDecodeError as e:
                Logger.error(self.sketch_id, {"message": f"An error occurred while parsing the JSON output from asnmap: {str(e)}"})
                return None

        except Exception as e:
            Logger.error(self.sketch_id, {"message": f"An error occurred while running asnmap: {str(e)}"})
            return None

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between organizations and their corresponding ASNs
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
                Logger.graph_append(self.sketch_id, {"message": f"Found for {input_org.name} -> ASN {result_asn.number}"})

        return results

# Make types available at module level for easy access
InputType = OrgToAsnScanner.InputType
OutputType = OrgToAsnScanner.OutputType