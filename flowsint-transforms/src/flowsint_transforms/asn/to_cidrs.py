import json
import os
from typing import List, Dict, Any, Union, Optional
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.graph_db import Neo4jConnection
from flowsint_types.cidr import CIDR
from flowsint_types.asn import ASN
from flowsint_core.utils import is_valid_asn, parse_asn
from flowsint_core.core.logger import Logger
from tools.network.asnmap import AsnmapTool


class AsnToCidrsTransform(Transform):
    """[ASNMAP] Takes an ASN and returns its corresponding CIDRs."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[ASN]
    OutputType = List[CIDR]

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
        return "asn_to_cidrs"

    @classmethod
    def category(cls) -> str:
        return "Asn"

    @classmethod
    def key(cls) -> str:
        return "number"

    def preprocess(
        self, data: Union[List[str], List[int], List[dict], InputType]
    ) -> InputType:
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
                Logger.warn(self.sketch_id, {"message": f"Invalid ASN format: {item}"})
                continue
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        """Find CIDR from ASN using asnmap."""
        cidrs: OutputType = []
        self._asn_to_cidrs_map = []  # Store mapping for postprocess
        asnmap = AsnmapTool()

        # Retrieve API key from vault or environment
        api_key = self.get_secret("PDCP_API_KEY", os.getenv("PDCP_API_KEY"))

        for asn in data:
            try:
                asn_cidrs = []
                # Use asnmap tool to get CIDR info, passing the API key
                # asnmap expects ASN with "AS" prefix
                cidr_data = asnmap.launch(f"AS{asn.number}", type="asn", api_key=api_key)

                if cidr_data and "as_range" in cidr_data and cidr_data["as_range"]:
                    # Add all CIDRs for this ASN
                    for cidr_str in cidr_data["as_range"]:
                        try:
                            cidr = CIDR(network=cidr_str)
                            cidrs.append(cidr)
                            asn_cidrs.append(cidr)
                        except Exception as e:
                            Logger.error(
                                self.sketch_id,
                                {"message": f"Failed to parse CIDR {cidr_str}: {str(e)}"},
                            )

                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"[ASNMAP] Found {len(asn_cidrs)} CIDRs for AS{asn.number}"
                        },
                    )
                else:
                    Logger.warn(
                        self.sketch_id,
                        {"message": f"[ASNMAP] No CIDRs found for AS{asn.number}"},
                    )

                if asn_cidrs:  # Only add to mapping if we found valid CIDRs
                    self._asn_to_cidrs_map.append((asn, asn_cidrs))

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error getting CIDRs for ASN {asn.number}: {e}"},
                )
                continue

        return cidrs

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between ASNs and their corresponding CIDRs
        # Use the mapping from scan if available, else fallback to zip
        asn_to_cidrs = getattr(self, "_asn_to_cidrs_map", None)
        if asn_to_cidrs is not None:
            for asn, cidr_list in asn_to_cidrs:
                for cidr in cidr_list:
                    if str(cidr.network) == "0.0.0.0/0":
                        continue  # Skip default CIDR for unknown ASN
                    if self.neo4j_conn:
                        self.create_node(
                            "asn",
                            "number",
                            asn.number,
                            label=f"AS{asn.number}",
                            caption=f"AS{asn.number}",
                            type="asn",
                        )

                        self.create_node(
                            "cidr",
                            "network",
                            str(cidr.network),
                            label=str(cidr.network),
                            caption=str(cidr.network),
                            type="cidr",
                        )

                        self.create_relationship(
                            "asn",
                            "number",
                            asn.number,
                            "cidr",
                            "network",
                            str(cidr.network),
                            "ANNOUNCES",
                        )

                        self.log_graph_message(
                            f"AS{asn.number} announces CIDR {cidr.network}"
                        )
        else:
            # Fallback: original behavior (one-to-one zip)
            for asn, cidr in zip(original_input, results):
                if str(cidr.network) == "0.0.0.0/0":
                    continue  # Skip default CIDR for unknown ASN
                if self.neo4j_conn:
                    self.create_node(
                        "asn",
                        "number",
                        asn.number,
                        label=f"AS{asn.number}",
                        caption=f"AS{asn.number}",
                        type="asn",
                    )

                    self.create_node(
                        "cidr",
                        "network",
                        str(cidr.network),
                        label=str(cidr.network),
                        caption=str(cidr.network),
                        type="cidr",
                    )

                    self.create_relationship(
                        "asn",
                        "number",
                        asn.number,
                        "cidr",
                        "network",
                        str(cidr.network),
                        "ANNOUNCES",
                    )

                    self.log_graph_message(
                        f"AS{asn.number} announces CIDR {cidr.network}"
                    )
        return results


# Make types available at module level for easy access
InputType = AsnToCidrsTransform.InputType
OutputType = AsnToCidrsTransform.OutputType
