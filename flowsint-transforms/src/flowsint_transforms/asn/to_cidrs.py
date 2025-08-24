import json
import subprocess
from typing import List, Dict, Any, Union
from flowsint_core.core.scanner_base import Scanner
from flowsint_types.cidr import CIDR
from flowsint_types.asn import ASN
from flowsint_core.utils import is_valid_asn, parse_asn
from flowsint_core.core.logger import Logger


class AsnToCidrsScanner(Scanner):
    """Takes an ASN and returns its corresponding CIDRs."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[ASN]
    OutputType = List[CIDR]

    @classmethod
    def name(cls) -> str:
        return "asn_to_cidrs"

    @classmethod
    def category(cls) -> str:
        return "Asn"

    @classmethod
    def key(cls) -> str:
        return "network"

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

        for asn in data:
            asn_cidrs = []
            cidr_data = self.__get_cidrs_from_asn(asn.number)
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
            else:
                Logger.warn(
                    self.sketch_id, {"message": f"No CIDRs found for ASN {asn.number}"}
                )

            if asn_cidrs:  # Only add to mapping if we found valid CIDRs
                self._asn_to_cidrs_map.append((asn, asn_cidrs))
        return cidrs

    def __get_cidrs_from_asn(self, asn: int) -> Dict[str, Any]:
        try:
            command = f"echo {asn} | asnmap -silent -json | jq -s '.'"
            result = subprocess.run(
                command, shell=True, capture_output=True, text=True, timeout=60
            )
            if not result.stdout.strip():
                Logger.info(self.sketch_id, {"message": f"No CIDRs found for {asn}."})
                return None
            try:
                # Parse the JSON array
                data_array = json.loads(result.stdout)
                if not data_array:
                    return None

                combined_data = {
                    "as_range": [],
                    "as_name": None,
                    "as_country": None,
                    "as_number": None,
                }

                for data in data_array:
                    if "as_range" in data:
                        combined_data["as_range"].extend(data["as_range"])
                    if data.get("as_name") and not combined_data["as_name"]:
                        combined_data["as_name"] = data["as_name"]
                    if data.get("as_country") and not combined_data["as_country"]:
                        combined_data["as_country"] = data["as_country"]
                    if data.get("as_number") and not combined_data["as_number"]:
                        combined_data["as_number"] = data["as_number"]

                return combined_data if combined_data["as_range"] else None

            except json.JSONDecodeError:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Failed to parse JSON from asnmap output: {result.stdout}"
                    },
                )
                return None

        except Exception as e:
            Logger.error(
                self.sketch_id, {"message": f"asnmap exception for {asn}: {str(e)}"}
            )
            return None

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
                            name=asn.name or "Unknown",
                            country=asn.country or "Unknown",
                            label=f"AS{asn.number}",
                            caption=f"AS{asn.number} - {asn.name or 'Unknown'}",
                            type="asn",
                        )

                        self.create_node(
                            "cidr",
                            "network",
                            str(cidr.network),
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
        else:
            # Fallback: original behavior (one-to-one zip)
            for asn, cidr in zip(original_input, results):
                if str(cidr.network) == "0.0.0.0/0":
                    continue  # Skip default CIDR for unknown ASN
                self.log_graph_message(f"ASN {asn.number} -> {cidr.network}")
                if self.neo4j_conn:
                    self.create_node(
                        "ASN",
                        "number",
                        asn.number,
                        name=asn.name or "Unknown",
                        country=asn.country or "Unknown",
                        label=f"AS{asn.number}",
                        caption=f"AS{asn.number} - {asn.name or 'Unknown'}",
                        type="asn",
                    )

                    self.create_node(
                        "CIDR",
                        "network",
                        str(cidr.network),
                        caption=str(cidr.network),
                        type="cidr",
                    )

                    self.create_relationship(
                        "ASN",
                        "number",
                        asn.number,
                        "CIDR",
                        "network",
                        str(cidr.network),
                        "ANNOUNCES",
                    )
        return results


# Make types available at module level for easy access
InputType = AsnToCidrsScanner.InputType
OutputType = AsnToCidrsScanner.OutputType
