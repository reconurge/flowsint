from typing import List
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.ip import Ip
from flowsint_types.domain import Domain
import random


@flowsint_enricher
class DomainToDummyIpEnricher(Enricher):
    """
    TEST TRANSFORM: Generate dummy ips for testing SSE incremental updates.
    """

    InputType = Domain
    OutputType = Ip

    @classmethod
    def name(cls) -> str:
        return "domain_to_dummy_ip"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    @classmethod
    def documentation(cls) -> str:
        """Return formatted markdown documentation for the test enricher."""
        return """
        """

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        """ """
        results: List[OutputType] = []
        # Dummy ips
        ips = [
            "192.168.12.34",
            "10.42.77.19",
            "172.16.5.201",
            "192.168.0.242",
            "10.0.23.88",
            "172.20.14.9",
            "192.168.56.101",
            "10.11.99.3",
            "172.31.222.17",
            "192.168.100.45",
            "10.25.60.7",
            "172.18.44.91",
            "192.168.77.12",
            "10.90.4.156",
            "172.26.200.66",
        ]

        for domain in data:
            # select a random ip
            address = random.choice(ips)
            ip = Ip(address=address)
            results.append(ip)
            # Log domain creation
            Logger.info(
                self.sketch_id,
                {"message": f"Found dummy IP {ip.address} for domain {domain.domain}."},
            )
        return results

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType]
    ) -> List[OutputType]:
        """ """
        for domain, ip in zip(original_input, results):
            self.create_node(domain)
            self.create_node(ip)
            self.create_relationship(domain, ip, "RESOLVES_TO")

        return results


InputType = DomainToDummyIpEnricher.InputType
OutputType = DomainToDummyIpEnricher.OutputType
