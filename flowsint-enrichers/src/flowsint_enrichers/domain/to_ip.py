import socket
from typing import List
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip


@flowsint_enricher
class ResolveEnricher(Enricher):
    """Resolve domain names to IP addresses."""

    InputType = Domain
    OutputType = Ip

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.domain_ip_mapping: List[tuple[Domain, Ip]] = []

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
        self.domain_ip_mapping = []
        for d in data:
            try:
                ip = socket.gethostbyname(d.domain)
                ip_obj = Ip(address=ip)
                results.append(ip_obj)
                self.domain_ip_mapping.append((d, ip_obj))
            except Exception as e:
                Logger.info(
                    self.sketch_id,
                    {"message": f"Error resolving {d.domain}: {e}"},
                )
                continue
        return results

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        for domain_obj, ip_obj in self.domain_ip_mapping:
            if not self._graph_service:
                continue
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
