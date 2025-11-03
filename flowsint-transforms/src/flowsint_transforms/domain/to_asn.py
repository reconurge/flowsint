import json
import os
import socket
from typing import Any, Dict, List, Optional, Union
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.graph_db import Neo4jConnection
from flowsint_types.domain import Domain
from flowsint_types.asn import ASN
from flowsint_core.utils import is_valid_domain
from flowsint_core.core.logger import Logger
from tools.network.asnmap import AsnmapTool


class DomainToAsnTransform(Transform):
    """[ASNMAP] Takes a domain and returns its corresponding ASN."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Domain]
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
        return "domain_to_asn"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            domain_obj = None
            if isinstance(item, str):
                if is_valid_domain(item):
                    domain_obj = Domain(domain=item)
            elif isinstance(item, dict) and "domain" in item:
                if is_valid_domain(item["domain"]):
                    domain_obj = Domain(domain=item["domain"])
            elif isinstance(item, Domain):
                domain_obj = item
            if domain_obj:
                cleaned.append(domain_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        asnmap = AsnmapTool()

        # Retrieve API key from vault or environment
        api_key = self.get_secret("PDCP_API_KEY", os.getenv("PDCP_API_KEY"))

        for domain in data:
            try:
                # Use asnmap tool to get ASN info from domain, passing the API key
                asn_data = asnmap.launch(domain.domain, type="domain", api_key=api_key)

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
                            "message": f"[ASNMAP] Found AS{asn.number} ({asn.name}) for domain {domain.domain}"
                        },
                    )
                else:
                    Logger.warn(
                        self.sketch_id,
                        {
                            "message": f"[ASNMAP] No ASN data or missing 'as_number' field for domain {domain.domain}"
                        },
                    )

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error getting ASN for domain {domain.domain}: {e}"},
                )
                continue

        return results

    def postprocess(
        self, results: OutputType, input_data: InputType = None
    ) -> OutputType:
        # Create Neo4j relationships between domains and their corresponding ASNs
        if input_data and self.neo4j_conn:
            for domain, asn in zip(input_data, results):
                # Create domain node
                self.create_node(
                    "domain",
                    "domain",
                    domain.domain,
                    label=domain.domain,
                    caption=domain.domain,
                    type="domain",
                )

                # Create ASN node
                self.create_node(
                    "asn",
                    "number",
                    asn.number,
                    label=f"AS{asn.number}",
                    caption=f"AS{asn.number}",
                    type="asn",
                )

                # Create relationship
                self.create_relationship(
                    "domain",
                    "domain",
                    domain.domain,
                    "asn",
                    "number",
                    asn.number,
                    "HOSTED_IN",
                )

                self.log_graph_message(
                    f"Domain {domain.domain} is hosted in AS{asn.number} ({asn.name})"
                )

        return results


# Make types available at module level for easy access
InputType = DomainToAsnTransform.InputType
OutputType = DomainToAsnTransform.OutputType
