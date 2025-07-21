import subprocess
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.cidr import CIDR
from app.types.ip import Ip
from app.utils import resolve_type
from app.core.logger import Logger

InputType: TypeAlias = List[CIDR]
OutputType: TypeAlias = List[Ip]

class CidrToIpsScanner(Scanner):
    """Takes a CIDR and returns its corresponding IP addresses."""

    @classmethod
    def name(cls) -> str:
        return "cidr_to_ips_scanner"

    @classmethod
    def category(cls) -> str:
        return "Cidr"

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
            cidr_obj = None
            try:
                if isinstance(item, str):
                    cidr_obj = CIDR(network=item)
                elif isinstance(item, dict) and "network" in item:
                    cidr_obj = CIDR(network=item["network"])
                elif isinstance(item, CIDR):
                    cidr_obj = item
                if cidr_obj:
                    cleaned.append(cidr_obj)
            except ValueError:
                Logger.warn(self.sketch_id, {"message": f"Invalid CIDR format: {item}"})
                continue
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        """Find IP addresses from CIDR using dnsx."""
        ips: OutputType = []
        for cidr in data:
            ip_addresses = self.__get_ips_from_cidr(cidr.network)
            if ip_addresses:
                for ip_str in ip_addresses:
                    try:
                        ip = Ip(address=ip_str.strip())
                        ips.append(ip)
                    except Exception as e:
                        Logger.error(self.sketch_id, {"message": f"Failed to parse IP {ip_str}: {str(e)}"})
            else:
                Logger.warn(self.sketch_id, {"message": f"No IPs found for CIDR {cidr.network}"})
        return ips
    
    def __get_ips_from_cidr(self, cidr: str) -> List[str]:
        try:
            command = f"echo {cidr} | dnsx -ptr"
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60
            )
            if not result.stdout.strip():
                Logger.info(self.sketch_id, {"message": f"No IPs found for {cidr}."})
                return []
            
            # Split the output by newlines and filter out empty lines
            ip_addresses = [ip.strip() for ip in result.stdout.split('\n') if ip.strip()]
            return ip_addresses

        except Exception as e:
            Logger.error(self.sketch_id, {"message": f"dnsx exception for {cidr}: {str(e)}"})
            return []

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between CIDRs and their corresponding IPs
        for cidr, ip in zip(original_input, results):
            Logger.graph_append(self.sketch_id, {"message": f"Found {len(results)} IPs for CIDR {cidr.network}"})
            if self.neo4j_conn:
                query = """
                MERGE (cidr:cidr {network: $cidr_network})
                SET cidr.sketch_id = $sketch_id,
                    cidr.label = $cidr_network,
                    cidr.caption = $cidr_network,
                    cidr.type = "cidr"
                
                MERGE (ip:ip {address: $ip_address})
                SET ip.sketch_id = $sketch_id,
                    ip.label = $ip_address,
                    ip.caption = $ip_address,
                    ip.type = "ip"
                
                MERGE (cidr)-[:CONTAINS {sketch_id: $sketch_id}]->(ip)
                """
                self.neo4j_conn.query(query, {
                    "cidr_network": str(cidr.network),
                    "ip_address": ip.address,
                    "sketch_id": self.sketch_id,
                })
        return results 