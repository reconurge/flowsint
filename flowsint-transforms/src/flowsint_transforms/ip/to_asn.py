import json
from typing import List, Union
from flowsint_core.core.transform_base import Transform
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

        for ip in data:
            try:
                # Use asnmap tool to get ASN info
                asn_data = asnmap.launch(ip.address, type="ip")

                if asn_data and "as_number" in asn_data:
                    asn = ASN(
                        asn=str(asn_data["as_number"]),
                        name=asn_data.get("as_name", ""),
                        org=asn_data.get("as_org", ""),
                        country=asn_data.get("as_country", ""),
                    )
                    results.append(asn)

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
                self.create_node(
                    "ip", "address", ip.address, caption=ip.address, type="ip"
                )

                # Create ASN node
                self.create_node(
                    "asn", "network", asn.asn, caption=f"AS{asn.asn}", type="asn"
                )

                # Create relationship
                self.create_relationship(
                    "ip", "address", ip.address, "asn", "network", asn.asn, "BELONGS_TO"
                )

                self.log_graph_message(
                    f"IP {ip.address} belongs to AS{asn.asn} ({asn.name})"
                )

        return results


# Make types available at module level for easy access
InputType = IpToAsnTransform.InputType
OutputType = IpToAsnTransform.OutputType
