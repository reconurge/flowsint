import json
import socket
import subprocess
from typing import List, Dict, Any, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.cidr import CIDR
from app.types.ip import Ip
from app.types.asn import ASN
from app.utils import is_valid_ip, resolve_type
from app.core.logger import Logger

class IpToAsnScanner(Scanner):
    """Takes an IP address and returns its corresponding ASN."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Ip]
    OutputType = List[ASN]

    @classmethod
    def name(cls) -> str:
        return "ip_to_asn_scanner"

    @classmethod
    def category(cls) -> str:
        return "Ip"
    
    @classmethod
    def key(cls) -> str:
        return "address"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            ip_obj = None
            if isinstance(item, str):
                if is_valid_ip(item):
                    ip_obj = Ip(address=item)
            elif isinstance(item, dict) and "address" in item:
                if is_valid_ip(item["address"]):
                    ip_obj = Ip(address=item["address"])
            elif isinstance(item, Ip):
                ip_obj = item
            if ip_obj:
                cleaned.append(ip_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        
        for ip in data:
            try:
                # Use asnmap to get ASN info
                result = subprocess.run(
                    ["asnmap", "-a", ip.address, "-json"],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    output = result.stdout.strip()
                    if output:
                        asn_data = json.loads(output)
                        if asn_data and 'as_number' in asn_data:
                            asn = ASN(
                                asn=str(asn_data['as_number']),
                                name=asn_data.get('as_name', ''),
                                org=asn_data.get('as_org', ''),
                                country=asn_data.get('as_country', '')
                            )
                            results.append(asn)
                            
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"Error getting ASN for IP {ip.address}: {e}"})
                continue
                
        return results

    def postprocess(self, results: OutputType, input_data: InputType = None) -> OutputType:
        return results

# Make types available at module level for easy access
InputType = IpToAsnScanner.InputType
OutputType = IpToAsnScanner.OutputType