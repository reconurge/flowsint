import os
from typing import List, Dict, Any, Union, Optional
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.graph_db import Neo4jConnection
from flowsint_types.organization import Organization
from flowsint_types.asn import ASN
from flowsint_core.core.logger import Logger
from tools.network.asnmap import AsnmapTool


class OrgToAsnTransform(Transform):
    """Takes an organization and returns its corresponding ASN."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Organization]
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
        return "org_to_asn"

    @classmethod
    def category(cls) -> str:
        return "Organization"

    @classmethod
    def key(cls) -> str:
        return "name"

    async def scan(self, data: InputType) -> OutputType:
        """Find ASN information for organizations using asnmap."""
        results: OutputType = []
        asnmap = AsnmapTool()

        # Retrieve API key from vault or environment
        api_key = self.get_secret("PDCP_API_KEY", os.getenv("PDCP_API_KEY"))

        for org in data:
            try:
                # Use asnmap tool to get ASN info, passing the API key
                asn_data = asnmap.launch(org.name, type="org", api_key=api_key)
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
                            "message": f"[ASNMAP] Found AS{asn.number} ({asn.name}) for organization {org.name}"
                        },
                    )
                else:
                    Logger.warn(
                        self.sketch_id,
                        {
                            "message": f"[ASNMAP] No ASN data or missing 'as_number' field for organization {org.name}. Data keys: {list(asn_data.keys()) if asn_data else 'None'}"
                        },
                    )
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error getting ASN for organization {org.name}: {e}"},
                )
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between organizations and their corresponding ASNs
        for input_org, result_asn in zip(original_input, results):
            # Skip if no valid ASN was found
            if result_asn.number == 0:
                continue

            if self.neo4j_conn:
                # Create organization node
                self.create_node(input_org)

                # Create ASN node
                self.create_node(result_asn)

                # Create relationship
                self.create_relationship(input_org, result_asn, "BELONGS_TO")

                self.log_graph_message(
                    f"Found for {input_org.name} -> ASN {result_asn.number}"
                )

        return results


# Make types available at module level for easy access
InputType = OrgToAsnTransform.InputType
OutputType = OrgToAsnTransform.OutputType
