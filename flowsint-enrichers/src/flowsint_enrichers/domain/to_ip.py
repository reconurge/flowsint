import socket
from typing import List
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip


class ResolveEnricher(Enricher):
    """Resolve domain names to IP addresses."""

    InputType = Domain
    OutputType = Ip

    @classmethod
    def name(cls) -> str:
        return "domain_to_ip"

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
        results: List[OutputType] = []
        for d in data:
            try:
                ip = socket.gethostbyname(d.domain)
                results.append(Ip(address=ip))
            except Exception as e:
                Logger.info(
                    self.sketch_id,
                    {"message": f"Error resolving {d.domain}: {e}"},
                )
                continue
        return results

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        for domain_obj, ip_obj in zip(original_input, results):
            self.create_node(domain_obj)
            self.create_node(ip_obj)
            self.create_relationship(
                domain_obj,
                ip_obj,
                "RESOLVES_TO",
            )
            self.log_graph_message(
                f"IP found for domain {domain_obj.domain} -> {ip_obj.address}"
            )
        return results


InputType = ResolveEnricher.InputType
OutputType = ResolveEnricher.OutputType
