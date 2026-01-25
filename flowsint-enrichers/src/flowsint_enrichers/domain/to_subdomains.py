import requests
from typing import List, Union
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.domain import Domain
from flowsint_core.utils import is_valid_domain
from flowsint_core.core.logger import Logger
from tools.network.subfinder import SubfinderTool


@flowsint_enricher
class SubdomainEnricher(Enricher):
    """Enricher to find subdomains associated with a domain."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Domain
    OutputType = Domain

    @classmethod
    def name(cls) -> str:
        return "domain_to_subdomains"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        """Find subdomains using subfinder (Docker) or fallback to crt.sh."""
        domains: List[OutputType] = []

        for md in data:
            d = Domain(domain=md.domain)
            # Try subfinder first (Docker-based)
            subdomains = self.__get_subdomains_from_subfinder(d.domain)

            # If subfinder fails or returns no results, fallback to crt.sh
            if not subdomains:
                Logger.warn(
                    self.sketch_id,
                    {
                        "message": f"subfinder failed for {d.domain}, falling back to crt.sh"
                    },
                )
                subdomains = self.__get_subdomains_from_crtsh(d.domain)

            domains.append({"domain": d.domain, "subdomains": sorted(subdomains)})

        return domains

    def __get_subdomains_from_crtsh(self, domain: str) -> set[str]:
        subdomains: set[str] = set()
        try:
            response = requests.get(
                f"https://crt.sh/?q=%25.{domain}&output=json", timeout=60
            )
            if response.ok:
                entries = response.json()
                for entry in entries:
                    name_value = entry.get("name_value", "")
                    for sub in name_value.split("\n"):
                        sub = sub.strip().lower()
                        if (
                            "*" not in sub
                            and is_valid_domain(sub)
                            and sub.endswith(domain)
                            and sub != domain
                        ):
                            subdomains.add(sub)
                        elif "*" in sub:
                            continue
        except Exception as e:
            Logger.error(
                self.sketch_id, {"message": f"crt.sh failed for {domain}: {e}"}
            )
        return subdomains

    def __get_subdomains_from_subfinder(self, domain: str) -> set[str]:
        subdomains: set[str] = set()
        try:
            subfinder = SubfinderTool()
            subdomains = subfinder.launch(domain)
        except Exception as e:
            Logger.error(
                self.sketch_id, {"message": f"subfinder exception for {domain}: {e}"}
            )
        return subdomains

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        output: List[OutputType] = []
        for domain_obj in results:
            if not self._graph_service:
                continue
            for subdomain in domain_obj["subdomains"]:
                output.append(Domain(domain=subdomain))
                Logger.info(
                    self.sketch_id,
                    {"message": f"{domain_obj['domain']} -> {subdomain}"},
                )

                # Create subdomain node
                parent_domain_obj = Domain(domain=domain_obj["domain"])
                subdomain_obj = Domain(domain=subdomain)
                self.create_node(subdomain_obj)

                # Create relationship from parent domain to subdomain
                self.create_relationship(parent_domain_obj, subdomain_obj, "HAS_SUBDOMAIN")

            self.log_graph_message(
                f"{domain_obj['domain']} -> {len(domain_obj['subdomains'])} subdomain(s) found."
            )

        return output


InputType = SubdomainEnricher.InputType
OutputType = SubdomainEnricher.OutputType
