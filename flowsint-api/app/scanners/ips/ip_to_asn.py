import json
import socket
import subprocess
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.cidr import CIDR
from app.types.ip import MinimalIp
from app.types.asn import ASN
from app.utils import is_valid_ip, resolve_type

InputType: TypeAlias = List[MinimalIp]
OutputType: TypeAlias = List[ASN]

class AsnScanner(Scanner):
    """Takes an IP addreses and returns its corresponding ASN."""

    @classmethod
    def name(cls) -> str:
        return "asn_resolve_scanner"

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
                ip_obj = MinimalIp(address=item)
            elif isinstance(item, dict) and "address" in item:
                ip_obj = MinimalIp(address=item["address"])
            elif isinstance(item, MinimalIp):
                ip_obj = item
            if ip_obj and is_valid_ip(ip_obj.address):
                cleaned.append(ip_obj)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        """Find ASN information for IP addresses using asnmap."""
        asns: OutputType = []
        self.logger.debug(message=f"[ASN_SCANNER]: input data: {str(data)}")

        for ip in data:
            asn_data = self.__get_asn_from_asnmap(ip.address)
            if asn_data:
                self.logger.info(message=f"IP {ip.address} has ASN {asn_data['as_number']}.")
                asns.append(ASN(
                    number=int(asn_data["as_number"].lstrip("AS")),
                    name=asn_data["as_name"],
                    country=asn_data["as_country"],
                    cidrs=[CIDR(network=cidr) for cidr in asn_data["as_range"]]
                ))
            else:
                self.logger.info(f"No ASN found for IP {ip.address}")
        return asns
    
    def __get_asn_from_asnmap(self, ip: str) -> Dict[str, Any]:
        try:
            # Properly run the shell pipeline using shell=True
            command = f"echo {ip} | asnmap -silent -json | jq"
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True, text=True, timeout=60
            )
            if not result.stdout.strip():
                self.logger.info(f"No ASN found for {ip}.")
                return None
            return json.loads(result.stdout)
        except Exception as e:
            self.logger.error(message=f"asnmap exception for {ip}: {str(e)}")
            return None

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between IP addresses and their corresponding ASNs
        for input_ip, result_asn in zip(original_input, results):
            # Skip if no valid ASN was found
            if result_asn.number == 0:
                continue
                
            query = """
            MERGE (ip:IP {address: $ip_address})
            SET ip.sketch_id = $sketch_id,
                ip.label = $ip_address,
                ip.caption = $ip_address,
                ip.type = "ip"
            
            MERGE (asn:ASN {number: $asn_number})
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