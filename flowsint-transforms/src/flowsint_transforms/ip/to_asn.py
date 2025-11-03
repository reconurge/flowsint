import json
import os
from typing import Any, Dict, List, Optional, Union
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.graph_db import Neo4jConnection
from flowsint_types.ip import Ip
from flowsint_types.asn import ASN
from flowsint_core.utils import is_valid_ip
from flowsint_core.core.logger import Logger
from tools.network.asnmap import AsnmapTool


class IpToAsnTransform(Transform):
    """[ASNMAP] Takes an IP address and returns its corresponding ASN."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Ip]
    OutputType = List[ASN]

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
        return True

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare required parameters for this transform"""
        return [
            {
                "name": "PDCP_API_KEY",
                "type": "vaultSecret",
                "description": "The ProjectDiscovery Cloud Platform API key for asnmap.",
                "required": True,
            },
        ]

    @classmethod
    def name(cls) -> str:
        return "ip_to_asn"

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
        asnmap = AsnmapTool()

        # Retrieve API key from vault or environment
        api_key = self.get_secret("PDCP_API_KEY", os.getenv("PDCP_API_KEY"))

        for ip in data:
            try:
                # Use asnmap tool to get ASN info, passing the API key
                asn_data = asnmap.launch(ip.address, type="ip", api_key=api_key)
                if asn_data and "as_number" in asn_data:
                    # Parse ASN number from string like "AS16276" to integer 16276
                    asn_string = asn_data["as_number"]
                    asn_number = int(asn_string.replace("AS", "").replace("as", ""))
                    # Create ASN object with correct field mapping
                    asn = ASN(
                        number=asn_number,
                        name=asn_data.get("as_name", ""),
                        country=asn_data.get("as_country", ""),
                        description=asn_data.get("as_name", ""),
                    )
                    results.append(asn)
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"[ASNMAP] Found AS{asn.number} ({asn.name}) for IP {ip.address}"
                        },
                    )
                else:
                    Logger.warn(
                        self.sketch_id,
                        {
                            "message": f"[ASNMAP] No ASN data or missing 'as_number' field for IP {ip.address}. Data keys: {list(asn_data.keys()) if asn_data else 'None'}"
                        },
                    )
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error getting ASN for IP {ip.address}: {e}"},
                )
                continue

        return results

    def postprocess(
        self, results: OutputType, input_data: InputType = None
    ) -> OutputType:
        # Create Neo4j relationships between IPs and their corresponding ASNs
        if input_data and self.neo4j_conn:
            for ip, asn in zip(input_data, results):
                # Create IP node
                self.create_node("ip", "address", ip.address, label=ip.address, type="ip", **ip.__dict__)
                # Create ASN node
                self.create_node("asn", "number", asn.number, label=f"AS{asn.number}", type="asn", **asn.__dict__)
                # Create relationship
                self.create_relationship(
                    "ip",
                    "address",
                    ip.address,
                    "asn",
                    "number",
                    asn.number,
                    "BELONGS_TO",
                )
                self.log_graph_message(
                    f"IP {ip.address} belongs to AS{asn.number} ({asn.name})"
                )

        return results


# Make types available at module level for easy access
InputType = IpToAsnTransform.InputType
OutputType = IpToAsnTransform.OutputType
