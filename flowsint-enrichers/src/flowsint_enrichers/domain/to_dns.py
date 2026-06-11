from typing import Any, Dict, List, Optional
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip
from tools.network.dnsx import DnsxTool


@flowsint_enricher
class DomainToDnsEnricher(Enricher):
    """[DNSX] Resolve a domain's A (IPv4) and AAAA (IPv6) records using dnsx."""

    InputType = Domain
    OutputType = Ip

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
        **kwargs,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
            **kwargs,
        )

    @classmethod
    def name(cls) -> str:
        return "domain_to_dns"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare parameters for this enricher."""
        return [
            {
                "name": "ipv6",
                "type": "select",
                "description": "Also resolve AAAA (IPv6) records",
                "required": False,
                "default": "true",
                "options": [
                    {"label": "Enabled", "value": "true"},
                    {"label": "Disabled", "value": "false"},
                ],
            },
            {
                "name": "PDCP_API_KEY",
                "type": "vaultSecret",
                "description": "ProjectDiscovery Cloud Platform API key (optional)",
                "required": False,
            },
        ]

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        try:
            dnsx = DnsxTool()
        except Exception as e:
            Logger.error(
                self.sketch_id,
                {"message": f"[DNSX] Failed to initialize dnsx: {e}"},
            )
            return results

        aaaa = self.params.get("ipv6", "true") == "true"
        api_key = self.get_secret("PDCP_API_KEY", None)

        for d in data:
            try:
                ips = dnsx.resolve_domain(d.domain, aaaa=aaaa, api_key=api_key)
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"[DNSX] Error resolving {d.domain}: {e}"},
                )
                continue

            for ip in ips:
                try:
                    ip_obj = Ip(address=ip)
                except Exception:
                    # dnsx occasionally emits non-address artifacts; skip them.
                    continue
                # Carry the source domain through to postprocess for graph wiring.
                setattr(ip_obj, "_source_domain", d.domain)
                results.append(ip_obj)
                Logger.info(
                    self.sketch_id,
                    {"message": f"[DNSX] {d.domain} -> {ip}"},
                )

        return results

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType] = None
    ) -> List[OutputType]:
        for ip_obj in results:
            if not self._graph_service:
                continue
            source_domain = getattr(ip_obj, "_source_domain", None)
            if not source_domain:
                continue

            domain_obj = Domain(domain=source_domain)
            self.create_node(domain_obj)
            self.create_node(ip_obj)
            self.create_relationship(domain_obj, ip_obj, "RESOLVES_TO")
            self.log_graph_message(
                f"IP found for domain {source_domain} -> {ip_obj.address}"
            )

            # Clean up the temporary attribute used to thread context.
            delattr(ip_obj, "_source_domain")

        return results


InputType = DomainToDnsEnricher.InputType
OutputType = DomainToDnsEnricher.OutputType
