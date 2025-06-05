import json
import socket
import subprocess
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.cidr import CIDR
from app.types.ip import MinimalIp
from app.types.asn import ASN
from app.utils import is_valid_asn, parse_asn, resolve_type

InputType: TypeAlias = List[ASN]
OutputType: TypeAlias = List[CIDR]

class AsnToCidrsScanner(Scanner):
    """Takes an ASN and returns its corresponding CIDRs."""

    @classmethod
    def name(cls) -> str:
        return "asn_to_cidrs_scanner"

    @classmethod
    def category(cls) -> str:
        return "asns"
    
    @classmethod
    def key(cls) -> str:
        return "number"

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

    def preprocess(self, data: Union[List[str], List[int], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            asn_obj = None
            try:
                if isinstance(item, (str, int)):
                    asn_obj = ASN(number=parse_asn(str(item)))
                elif isinstance(item, dict) and "number" in item:
                    asn_obj = ASN(number=parse_asn(str(item["number"])))
                elif isinstance(item, ASN):
                    asn_obj = item
                if asn_obj and is_valid_asn(str(asn_obj.number)):
                    cleaned.append(asn_obj)
            except ValueError:
                self.logger.warn(f"Invalid ASN format: {item}")
                continue
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        """Find CIDR from ASN using asnmap."""
        cidrs: OutputType = []
        self.logger.debug(message=f"[ASN_TO_CIDRS_SCANNER]: input data: {str(data)}")

        for asn in data:
            cidr_data = self.__get_cidrs_from_asn(asn.number)
            if cidr_data and "as_range" in cidr_data and cidr_data["as_range"]:
                # Add all CIDRs for this ASN
                for cidr_str in cidr_data["as_range"]:
                    try:
                        cidr = CIDR(network=cidr_str)
                        cidrs.append(cidr)
                    except Exception as e:
                        self.logger.error(f"Failed to parse CIDR {cidr_str}: {str(e)}")
                # If no valid CIDRs were added, add the default one
                if not any(str(c.network) != "0.0.0.0/0" for c in cidrs):
                    cidrs.append(CIDR(network="0.0.0.0/0"))
            else:
                self.logger.warn(f"No CIDRs found for ASN {asn.number}")
                # Add an empty CIDR to maintain input/output mapping
                cidrs.append(CIDR(network="0.0.0.0/0"))

        return cidrs
    
    def __get_cidrs_from_asn(self, asn: int) -> Dict[str, Any]:
        try:
            command = f"echo {asn} | asnmap -silent -json | jq -s '.'"
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True, text=True, timeout=60
            )
            if not result.stdout.strip():
                self.logger.info(f"No CIDRs found for {asn}.")
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

                return combined_data if combined_data["as_range"] else None

            except json.JSONDecodeError:
                self.logger.error(f"Failed to parse JSON from asnmap output: {result.stdout}")
                return None

        except Exception as e:
            self.logger.error(message=f"asnmap exception for {asn}: {str(e)}")
            return None

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between ASNs and their corresponding CIDRs
        for asn, cidr in zip(original_input, results):
            if self.neo4j_conn:
                query = """
                MERGE (asn:ASN {number: $asn_number})
                SET asn.sketch_id = $sketch_id,
                    asn.name = $asn_name,
                    asn.country = $asn_country,
                    asn.label = $asn_label,
                    asn.caption = $asn_caption,
                    asn.type = "asn"
                
                MERGE (cidr:CIDR {network: $cidr_network})
                SET cidr.sketch_id = $sketch_id,
                    cidr.label = $cidr_network,
                    cidr.caption = $cidr_network,
                    cidr.type = "cidr"
                
                MERGE (asn)-[:ANNOUNCES {sketch_id: $sketch_id}]->(cidr)
                """
                self.neo4j_conn.query(query, {
                    "asn_number": asn.number,
                    "asn_name": asn.name or "Unknown",
                    "asn_country": asn.country or "Unknown",
                    "asn_label": f"AS{asn.number}",
                    "asn_caption": f"AS{asn.number} - {asn.name or 'Unknown'}",
                    "cidr_network": str(cidr.network),
                    "sketch_id": self.sketch_id,
                })
        return results