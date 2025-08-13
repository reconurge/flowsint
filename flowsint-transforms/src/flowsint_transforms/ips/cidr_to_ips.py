import subprocess
from typing import List, Union
from flowsint_core.core.scanner_base import Scanner
from flowsint_types.cidr import CIDR
from flowsint_types.ip import Ip
from flowsint_core.core.logger import Logger


class CidrToIpsScanner(Scanner):
    """Takes a CIDR and returns its corresponding IP addresses."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[CIDR]
    OutputType = List[Ip]

    @classmethod
    def name(cls) -> str:
        return "cidr_to_ips_scanner"

    @classmethod
    def category(cls) -> str:
        return "Cidr"

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
                        Logger.error(
                            self.sketch_id,
                            {"message": f"Failed to parse IP {ip_str}: {str(e)}"},
                        )
            else:
                Logger.warn(
                    self.sketch_id, {"message": f"No IPs found for CIDR {cidr.network}"}
                )
        return ips

    def __get_ips_from_cidr(self, cidr: str) -> List[str]:
        try:
            command = f"echo {cidr} | dnsx -ptr"
            result = subprocess.run(
                command, shell=True, capture_output=True, text=True, timeout=60
            )
            if not result.stdout.strip():
                Logger.info(self.sketch_id, {"message": f"No IPs found for {cidr}."})
                return []

            # Split the output by newlines and filter out empty lines
            ip_addresses = [
                ip.strip() for ip in result.stdout.split("\n") if ip.strip()
            ]
            return ip_addresses

        except Exception as e:
            Logger.error(
                self.sketch_id, {"message": f"dnsx exception for {cidr}: {str(e)}"}
            )
            return []

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between CIDRs and their corresponding IPs
        for cidr, ip in zip(original_input, results):
            if self.neo4j_conn:
                # Create CIDR node
                self.create_node(
                    "cidr",
                    "network",
                    str(cidr.network),
                    caption=str(cidr.network),
                    type="cidr",
                )

                # Create IP node
                self.create_node(
                    "ip", "address", ip.address, caption=ip.address, type="ip"
                )

                # Create relationship
                self.create_relationship(
                    "cidr",
                    "network",
                    str(cidr.network),
                    "ip",
                    "address",
                    ip.address,
                    "CONTAINS",
                )

            self.log_graph_message(f"Found {len(results)} IPs for CIDR {cidr.network}")
        return results


# Make types available at module level for easy access
InputType = CidrToIpsScanner.InputType
OutputType = CidrToIpsScanner.OutputType
