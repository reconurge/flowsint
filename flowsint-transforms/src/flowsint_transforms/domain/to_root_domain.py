from typing import List, Union
from flowsint_transforms.utils import is_valid_domain, get_root_domain
from flowsint_core.core.transform_base import Transform
from flowsint_types.domain import Domain
from flowsint_core.core.logger import Logger


class DomainToRootDomain(Transform):
    """Subdomain to root domain."""

    InputType = List[Domain]
    OutputType = List[Domain]

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

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Use the mapping we created during scan to create relationships
        for original_domain, root_domain in self.domain_root_mapping:
            if not self.neo4j_conn:
                continue

            # Create root domain node
            self.create_node("domain", "domain", root_domain.domain, **root_domain.__dict__)

            # Create original domain node
            self.create_node("domain", "domain", original_domain.domain, **original_domain.__dict__)

            # Create relationship from root domain to original domain
            self.create_relationship(
                "domain",
                "domain",
                root_domain.domain,
                "domain",
                "domain",
                original_domain.domain,
                "HAS_SUBDOMAIN",
            )

            self.log_graph_message(
                f"{root_domain.domain} -> HAS_SUBDOMAIN -> {original_domain.domain}"
            )

        return results


# Make types available at module level for easy access
InputType = DomainToRootDomain.InputType
OutputType = DomainToRootDomain.OutputType
