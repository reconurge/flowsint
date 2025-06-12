import json
import socket
import subprocess
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.cidr import CIDR
from app.types.ip import Ip
from app.types.asn import ASN
from app.utils import is_valid_ip, resolve_type
from app.core.logger import Logger

InputType: TypeAlias = List[Ip]
OutputType: TypeAlias = List[ASN]

class IpToAsnScanner(Scanner):
    """Takes an IP addreses and returns its corresponding ASN."""

    @classmethod
    def name(cls) -> str:
        return "ip_to_asn_scanner"

    @classmethod
    def category(cls) -> str:
        return "ips"
    
    @classmethod
    def key(cls) -> str:
        return "address"

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
            ip_obj = None
            if isinstance(item, str):
                ip_obj = Ip(address=item)
            elif isinstance(item, dict) and "address" in item:
                ip_obj = Ip(address=item["address"])
            elif isinstance(item, Ip):
                ip_obj = item
            if ip_obj and is_valid_ip(ip_obj.address):
                cleaned.append(ip_obj)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        """Find ASN information for IP addresses using asnmap."""
        asns: OutputType = []

        for ip in data:
            asn_data = self.__get_asn_from_asnmap(ip.address)
            if asn_data:
                Logger.info(self.sketch_id, f"IP {ip.address} has ASN {asn_data['as_number']}.")
                asns.append(ASN(
                    number=int(asn_data["as_number"].lstrip("AS")),
                    name=asn_data["as_name"],
                    country=asn_data["as_country"],
                    cidrs=[CIDR(network=cidr) for cidr in asn_data["as_range"]]
                ))
            else:
                Logger.info(self.sketch_id, f"No ASN found for IP {ip.address}")
        return asns
    
    def __get_asn_from_asnmap(self, ip: str) -> Dict[str, Any]:
        try:
            # Properly run the shell pipeline using shell=True
            command = f"echo {ip} | asnmap -silent -json | jq -s '.'"
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True, text=True, timeout=60
            )
            if not result.stdout.strip():
                Logger.info(self.sketch_id, f"No ASN found for {ip}.")
                return None
            try:
                # Parse the JSON array
                data_array = json.loads(result.stdout)
                if not data_array:
                    return None

                combined_data = {
                    "as_number": None,
                    "as_name": None,
                    "as_country": None,
                    "as_range": []
                }

                for data in data_array:
                    if data.get("as_number") and not combined_data["as_number"]:
                        combined_data["as_number"] = data["as_number"]
                    if data.get("as_name") and not combined_data["as_name"]:
                        combined_data["as_name"] = data["as_name"]
                    if data.get("as_country") and not combined_data["as_country"]:
                        combined_data["as_country"] = data["as_country"]
                    if "as_range" in data:
                        combined_data["as_range"].extend(data["as_range"])

                return combined_data if combined_data["as_number"] else None

            except json.JSONDecodeError:
                Logger.error(self.sketch_id, f"Failed to parse JSON from asnmap output: {result.stdout}")
                return None

        except Exception as e:
            Logger.error(self.sketch_id, f"asnmap exception for {ip}: {str(e)}")
            return None

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between IP addresses and their corresponding ASNs
        for input_ip, result_asn in zip(original_input, results):
            # Skip if no valid ASN was found
            if result_asn.number == 0:
                continue
                
            query = """
            MERGE (ip:ip {address: $ip_address})
            SET ip.sketch_id = $sketch_id,
                ip.label = $ip_address,
                ip.caption = $ip_address,
                ip.type = "ip"
            
            MERGE (asn:asn {number: $asn_number})
            SET asn.sketch_id = $sketch_id,
                asn.name = $asn_name,
                asn.country = $asn_country,
                asn.label = $asn_label,
                asn.caption = $asn_caption,
                asn.type = "asn"
            
            MERGE (ip)-[:BELONGS_TO {sketch_id: $sketch_id}]->(asn)
            """
            
            if self.neo4j_conn:
                self.neo4j_conn.query(query, {
                    "ip_address": input_ip.address,
                    "asn_number": result_asn.number,
                    "asn_name": result_asn.name,
                    "asn_country": result_asn.country,
                    "asn_label": f"AS{result_asn.number}",
                    "asn_caption": f"AS{result_asn.number} - {result_asn.name}",
                    "sketch_id": self.sketch_id,
                })

        return results