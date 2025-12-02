import socket
from typing import Dict, List
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.domain import Domain
from flowsint_types.email import Email
from flowsint_types.ip import Ip


@flowsint_enricher
class ToDummyEnricher(Enricher):
    """ToDummyEnricher"""

    InputType = Domain
    OutputType = Ip

    @classmethod
    def name(cls) -> str:
        return "domain_to_dummy"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    @classmethod
    def documentation(cls) -> str:
        """Return formatted markdown documentation for the domain resolver enricher."""
        return ""

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: Dict[str, List[OutputType]] = {}
        for d in data:
            # Add dummy related items
            related = [
                Domain(domain=f"sub.{d.domain}"),
                Email(email=f"{d.domain}@domain.com"),
            ]
            results[d.domain] = related
        return results

    def postprocess(
        self, results: Dict[str, List[OutputType]], original_input: List[InputType]
    ) -> List[OutputType]:
        for domain in results:
            root = Domain(domain=domain)
            self.create_node(root)
            for item in results[domain]:
                self.create_node(item)
                self.create_relationship(
                    root,
                    item,
                    "IS_RELATED_T0",
                )
        self.log_graph_message(f"Dummy enricher finished.")
        return results


InputType = ToDummyEnricher.InputType
OutputType = ToDummyEnricher.OutputType
