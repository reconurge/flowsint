import re
import socket
import requests
from typing import List, Union
from flowsint_core.core.logger import Logger
from flowsint_core.core.transform_base import Transform
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip
from flowsint_core.utils import is_valid_ip

PTR_BLACKLIST = re.compile(r"^ip\d+\.ip-\d+-\d+-\d+-\d+\.")


class ReverseResolveTransform(Transform):
    """Resolve IP addresses to domain names using PTR, Certificate Transparency and optional API calls."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Ip]
    OutputType = List[Domain]

    @classmethod
    def name(cls) -> str:
        return "ip_to_domain"

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

        for ip in data:
            try:
                # Try PTR lookup
                try:
                    hostname = socket.gethostbyaddr(ip.address)[0]
                    if hostname and not PTR_BLACKLIST.match(hostname):
                        domain = Domain(domain=hostname)
                        results.append(domain)
                        continue
                except socket.herror:
                    pass

                # Try Certificate Transparency logs
                try:
                    ct_url = f"https://crt.sh/?q={ip.address}&output=json"
                    response = requests.get(ct_url, timeout=10)
                    if response.status_code == 200:
                        ct_data = response.json()
                        for entry in ct_data[:5]:  # Limit to first 5 results
                            name_value = entry.get("name_value", "")
                            if name_value and name_value != ip.address:
                                domain = Domain(domain=name_value)
                                results.append(domain)
                                break
                except Exception:
                    pass

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error reverse resolving IP {ip.address}: {e}"},
                )
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create nodes and relationships for each resolved domain
        for ip_obj in original_input:
            # Create IP node
            self.create_node("ip", "address", ip_obj.address, **ip_obj.__dict__)

            # Create domain nodes and relationships for each resolved domain
            for domain_obj in results:
                self.create_node(
                    "domain",
                    "domain",
                    domain_obj.domain,
                    type=(
                        "domain"
                        if "." not in domain_obj.domain.split(".")[1:]
                        else "subdomain"
                    ),
                )
                self.create_relationship(
                    "ip",
                    "address",
                    ip_obj.address,
                    "domain",
                    "domain",
                    domain_obj.domain,
                    "REVERSE_RESOLVES_TO",
                )
                self.log_graph_message(
                    f"Domain found for IP {ip_obj.address} -> {domain_obj.domain}"
                )

        return results


# Make types available at module level for easy access
InputType = ReverseResolveTransform.InputType
OutputType = ReverseResolveTransform.OutputType
