import os
from typing import Any, Dict, List, Optional, Union
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_core.core.graph_db import Neo4jConnection
from flowsint_types.cidr import CIDR
from flowsint_types.ip import Ip
from flowsint_core.core.logger import Logger
from tools.network.mapcidr import MapcidrTool


@flowsint_enricher
class CidrToIpsEnricher(Enricher):
    """[MAPCIDR] Takes a CIDR and returns its corresponding IP addresses."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = CIDR
    OutputType = Ip

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
        """Declare optional parameters for this enricher"""
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

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        """Find IP addresses from CIDR using mapcidr."""
        ips: List[OutputType] = []
        self._cidr_to_ips_map = []  # Store mapping for postprocess
        mapcidr = MapcidrTool()

        # Retrieve API key from vault or environment (optional)
        api_key = self.get_secret("PDCP_API_KEY", os.getenv("PDCP_API_KEY"))

        for cidr in data:
            try:
                cidr_ips = []
                # Use mapcidr tool to get IPs from CIDR, passing the API key
                ip_addresses = mapcidr.launch(cidr.network, api_key=api_key)

                if ip_addresses:
                    for ip_str in ip_addresses:
                        try:
                            ip = Ip(address=ip_str.strip())
                            ips.append(ip)
                            cidr_ips.append(ip)
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

                if cidr_ips:  # Only add to mapping if we found valid IPs
                    self._cidr_to_ips_map.append((cidr, cidr_ips))

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error getting IPs for CIDR {cidr.network}: {e}"},
                )
                continue

        return ips

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        # Create Neo4j relationships between CIDRs and their corresponding IPs
        # Use the mapping from scan if available, else fallback to zip
        cidr_to_ips = getattr(self, "_cidr_to_ips_map", None)
        if cidr_to_ips is not None:
            for cidr, ip_list in cidr_to_ips:
                self.log_graph_message(
                    f"Found {len(ip_list)} IPs in CIDR {cidr.network}"
                )
                for ip in ip_list:
                    if self.neo4j_conn:
                        # Create CIDR node
                        self.create_node(cidr)

                        # Create IP node
                        self.create_node(ip)

                        # Create relationship
                        self.create_relationship(cidr, ip, "CONTAINS")
        else:
            # Fallback: original behavior (one-to-one zip)
            for cidr, ip in zip(original_input, results):
                if self.neo4j_conn:
                    # Create CIDR node
                    self.create_node(cidr)
                    # Create IP node
                    self.create_node(ip)
                    # Create relationship
                    cidr_obj = CIDR(network=str(cidr.network))
                    ip_obj = Ip(address=ip.address)
                    self.create_relationship(cidr_obj, ip_obj, "CONTAINS")

                    self.log_graph_message(
                        f"CIDR {cidr.network} contains IP {ip.address}"
                    )
        return results


# Make types available at module level for easy access
InputType = CidrToIpsEnricher.InputType
OutputType = CidrToIpsEnricher.OutputType
