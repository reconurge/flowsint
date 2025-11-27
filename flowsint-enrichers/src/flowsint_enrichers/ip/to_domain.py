import socket
import requests
from typing import List
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip


class ReverseResolveEnricher(Enricher):
    """Resolve IP addresses to domain names using PTR, Certificate Transparency and optional API calls."""

    InputType = Ip
    OutputType = Domain

    @classmethod
    def name(cls) -> str:
        return "ip_to_domain"

    @classmethod
    def category(cls) -> str:
        return "Ip"

    @classmethod
    def key(cls) -> str:
        return "address"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        for ip in data:
            try:
                try:
                    hostname = socket.gethostbyaddr(ip.address)[0]
                    if hostname:
                        domain = Domain(domain=hostname)
                        results.append(domain)
                        continue
                except socket.herror:
                    pass

                try:
                    ct_url = f"https://crt.sh/?q={ip.address}&output=json"
                    response = requests.get(ct_url, timeout=10)
                    if response.status_code == 200:
                        ct_data = response.json()
                        for entry in ct_data[:15]:
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

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        for ip_obj in original_input:
            self.create_node(ip_obj)
            for domain_obj in results:
                self.create_node(domain_obj)
                self.create_relationship(ip_obj, domain_obj, "REVERSE_RESOLVES_TO")
                self.log_graph_message(
                    f"Domain found for IP {ip_obj.address} -> {domain_obj.domain}"
                )

        return results


InputType = ReverseResolveEnricher.InputType
OutputType = ReverseResolveEnricher.OutputType
