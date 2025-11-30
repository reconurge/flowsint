from typing import List, Union
from flowsint_enrichers.utils import is_valid_domain, get_root_domain
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.domain import Domain
from flowsint_core.core.logger import Logger


@flowsint_enricher
class DomainToRootDomain(Enricher):
    """Subdomain to root domain."""

    InputType = Domain
    OutputType = Domain

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Store mapping between original domains and their root domains
        self.domain_root_mapping: List[tuple[Domain, Domain]] = []

    @classmethod
    def name(cls) -> str:
        return "domain_to_root_domain"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []
        self.domain_root_mapping = []  # Reset mapping

        for domain in data:
            try:
                root_domain_name = get_root_domain(domain.domain)
                # Only add if it's different from the original domain
                if root_domain_name != domain.domain:
                    root_domain = Domain(domain=root_domain_name, root=True)
                    results.append(root_domain)
                    # Store the mapping for postprocess
                    self.domain_root_mapping.append((domain, root_domain))

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error getting root domain for {domain.domain}: {e}"},
                )
                continue

        return results

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        # Use the mapping we created during scan to create relationships
        for original_domain, root_domain in self.domain_root_mapping:
            if not self.neo4j_conn:
                continue

            # New simplified pattern: pass Pydantic objects directly
            # Override type when needed
            self.create_node(root_domain)
            self.create_node(original_domain)

            # Create relationship from root domain to original domain
            self.create_relationship(root_domain, original_domain, "HAS_SUBDOMAIN")

            self.log_graph_message(
                f"{root_domain.domain} -> HAS_SUBDOMAIN -> {original_domain.domain}"
            )

        return results


# Make types available at module level for easy access
InputType = DomainToRootDomain.InputType
OutputType = DomainToRootDomain.OutputType
