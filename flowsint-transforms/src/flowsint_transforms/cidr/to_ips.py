import os
from typing import Any, Dict, List, Optional, Union
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.graph_db import Neo4jConnection
from flowsint_types.cidr import CIDR
from flowsint_types.ip import Ip
from flowsint_core.core.logger import Logger
from tools.network.mapcidr import MapcidrTool


class CidrToIpsTransform(Transform):
    """[MAPCIDR] Takes a CIDR and returns its corresponding IP addresses."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[CIDR]
    OutputType = List[Ip]

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        neo4j_conn: Optional[Neo4jConnection] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            neo4j_conn=neo4j_conn,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )

    @classmethod
    def required_params(cls) -> bool:
        return False

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare optional parameters for this transform"""
        return [
            {
                "name": "PDCP_API_KEY",
                "type": "vaultSecret",
                "description": "Optional ProjectDiscovery Cloud Platform API key for mapcidr.",
                "required": False,
            },
        ]

    @classmethod
    def name(cls) -> str:
        return "cidr_to_ips"

    @classmethod
    def key(cls) -> str:
        return "network"

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
        """Find IP addresses from CIDR using mapcidr."""
        ips: OutputType = []
        mapcidr = MapcidrTool()

        # Retrieve API key from vault or environment (optional)
        api_key = self.get_secret("PDCP_API_KEY", os.getenv("PDCP_API_KEY"))

        for cidr in data:
            try:
                # Use mapcidr tool to get IPs from CIDR, passing the API key
                ip_addresses = mapcidr.launch(cidr.network, api_key=api_key)

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

                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"[MAPCIDR] Found {len(ip_addresses)} IPs for CIDR {cidr.network}"
                        },
                    )
                else:
                    Logger.warn(
                        self.sketch_id,
                        {"message": f"[MAPCIDR] No IPs found for CIDR {cidr.network}"},
                    )

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error getting IPs for CIDR {cidr.network}: {e}"},
                )
                continue

        return ips

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between CIDRs and their corresponding IPs
        for cidr, ip in zip(original_input, results):
            if self.neo4j_conn:
                # Create CIDR node
                self.create_node(
                    "cidr",
                    "network",
                    str(cidr.network),
                    label=str(cidr.network),
                    caption=str(cidr.network),
                    type="cidr",
                )

                # Create IP node
                self.create_node(
                    "ip",
                    "address",
                    ip.address,
                    label=ip.address,
                    caption=ip.address,
                    type="ip",
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

                self.log_graph_message(f"CIDR {cidr.network} contains IP {ip.address}")
        return results


# Make types available at module level for easy access
InputType = CidrToIpsTransform.InputType
OutputType = CidrToIpsTransform.OutputType
