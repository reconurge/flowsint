import asyncio
from typing import List
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.ip import Ip
from flowsint_types.domain import Domain


@flowsint_enricher
class IpToDummyDomainsEnricher(Enricher):
    """
    TEST TRANSFORM: Generate dummy domains for testing SSE incremental updates.
    """

    InputType = Ip
    OutputType = Domain

    @classmethod
    def name(cls) -> str:
        return "ip_to_dummy_domains"

    @classmethod
    def category(cls) -> str:
        return "IP"

    @classmethod
    def key(cls) -> str:
        return "ip"

    @classmethod
    def documentation(cls) -> str:
        """Return formatted markdown documentation for the test enricher."""
        return """
        """

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        """
        Generate dummy domains for each IP address.

        This is a test enricher that creates approximately 20 dummy domains
        per IP address for testing purposes.
        """
        results: List[OutputType] = []

        # Common service prefixes for realistic dummy data
        services = [
            "web",
            "api",
            "mail",
            "ftp",
            "ssh",
            "vpn",
            "dns",
            "cdn",
            "app",
            "admin",
            "dev",
            "staging",
            "prod",
            "test",
            "demo",
            "db",
            "cache",
            "queue",
            "storage",
            "backup",
            "monitor",
        ]

        # Common TLDs for dummy domains
        tlds = [
            "com",
            "net",
            "org",
            "io",
            "dev",
            "test",
            "example.com",
            "example.net",
            "example.org",
        ]

        for ip_obj in data:
            # Normalize IP for use in domain names (replace dots with dashes)
            ip_normalized = ip_obj.address.replace(".", "-")

            # Generate 20 dummy domains per IP
            for i in range(530):
                service = services[i % len(services)]
                tld = tlds[i % len(tlds)]

                # Create dummy domain with pattern: {service}-{ip}.{tld}
                dummy_domain = f"{service}-{i}-{ip_normalized}.{tld}"
                domain_obj = Domain(domain=dummy_domain)
                results.append(domain_obj)

                # Log domain creation
                Logger.info(
                    self.sketch_id,
                    {
                        "message": f"Generated dummy domain: {dummy_domain} for IP {ip_obj.address}",
                        "ip": ip_obj.address,
                        "domain": dummy_domain,
                    },
                )

        Logger.info(
            self.sketch_id,
            {
                "message": f"Generated {len(results)} dummy domains for {len(data)} IP(s)",
                "total_domains": len(results),
                "total_ips": len(data),
            },
        )

        return results

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType]
    ) -> List[OutputType]:
        """
        Create nodes and relationships in the graph.

        This method creates all the IP nodes and their associated domain nodes
        with HOSTS relationships.
        """
        # Create IP nodes
        for ip_obj in original_input:
            self.create_node(ip_obj)

        # Create domain nodes and relationships
        for domain_obj in results:
            self.create_node(domain_obj)

            # Find the corresponding IP for this domain
            # Domain format is: {service}-{ip-normalized}.{tld}
            # We need to extract the IP from the domain name
            domain_name = domain_obj.domain
            # Extract IP part (between first '-' and last '.')
            parts = domain_name.split("-", 1)
            if len(parts) > 1:
                ip_part = parts[1].rsplit(".", 1)[0]  # Remove TLD
                ip_address = ip_part.replace("-", ".")

                # Find matching IP object
                for ip_obj in original_input:
                    if ip_obj.address == ip_address:
                        self.create_relationship(ip_obj, domain_obj, "HOSTS")
                        break

        return results


InputType = IpToDummyDomainsEnricher.InputType
OutputType = IpToDummyDomainsEnricher.OutputType
