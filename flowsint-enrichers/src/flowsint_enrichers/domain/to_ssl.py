import json
import os
import requests
import subprocess

from typing import Any, Dict, List, Optional
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.domain import Domain
from flowsint_types.website import Website
from flowsint_core.core.logger import Logger
from flowsint_types.address import Location

@flowsint_enricher
class DomainToTLS(Enricher):
    """[httpX] Get TLS information from a domain."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Domain
    OutputType = Website

    # @classmethod
    # def required_params(cls) -> bool:
    #     return True

    @classmethod
    def name(cls) -> str:
        return "domain_to_tls"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        for domain in data:
            Logger.info(self.sketch_id, f"(DomainToTLS) Received {len(data)} inputs")
            try:
                httpx_process = subprocess.Popen(
                    ["/root/go/bin/httpx", "-tls-grab", "-json", "-silent"],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )

                stdout, stderr = httpx_process.communicate(f'{domain.domain}\n')

                if not stdout.strip():
                    Logger.error(None, {"message": f"(DomainToTLS) No results for the domain '{domain.domain}'"})
                    continue
                else:
                    for line in stdout.splitlines():
                        if line.strip():
                            tlsdata = json.loads(line)

                            web_url = tlsdata.get("url")
                            web_title = tlsdata.get("title")
                            web_content_type = tlsdata.get("content_type")
                            web_statuscode = tlsdata.get("status_code") # status_code is int

                            results.append(
                                Website(
                                    url=web_url if web_url else None,
                                    domain=domain,
                                    active=True,
                                    title=web_title if web_title else None,
                                    content_type=web_content_type if web_content_type else None,
                                    status_code=web_statuscode if web_statuscode else None
                                )
                            )                
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"(DomainToTLS) Exception while querying the domain '{domain.domain}': {e}"})
        
        return results

    def postprocess(
        self, results: List[OutputType], input_data: List[InputType] = None
    ) -> List[OutputType]:
        if not self._graph_service:
            return results

        if input_data and self._graph_service:
            for domain in input_data:
                for website in results:
                    self.create_node(domain)
                    self.create_node(website)

                    # Create relationship
                    self.create_relationship(domain, website, "TLS_INFO")
                    self.log_graph_message(
                        f"(DomainToTLS) Successfully fetched TLS information for the domain '{domain.domain}'. "
                    )

        return results


# Make types available at module level for easy access
InputType = DomainToTLS.InputType
OutputType = DomainToTLS.OutputType