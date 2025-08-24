import json
import socket
import subprocess
from typing import List, Union
from flowsint_core.core.scanner_base import Scanner
from flowsint_types.domain import Domain
from flowsint_types.asn import ASN
from flowsint_core.utils import is_valid_domain
from flowsint_core.core.logger import Logger


class DomainToAsnScanner(Scanner):
    """Takes a domain and returns its corresponding ASN."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Domain]
    OutputType = List[ASN]

    @classmethod
    def name(cls) -> str:
        return "domain_to_asn"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "Domain"

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
        for domain in data:
            try:
                # First resolve domain to IP
                ip = socket.gethostbyname(domain.domain)

                # Use asnmap to get ASN info
                result = subprocess.run(
                    ["asnmap", "-a", ip, "-json"],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )

                if result.returncode == 0:
                    output = result.stdout.strip()
                    if output:
                        asn_data = json.loads(output)
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
                    {"message": f"Error getting ASN for domain {domain.domain}: {e}"},
                )
                continue

        return results

    def postprocess(
        self, results: OutputType, input_data: InputType = None
    ) -> OutputType:
        return results


# Make types available at module level for easy access
InputType = DomainToAsnScanner.InputType
OutputType = DomainToAsnScanner.OutputType
