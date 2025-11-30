from typing import List, Union
import requests
from flowsint_core.utils import is_valid_domain
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.domain import Domain
from flowsint_types.website import Website
from flowsint_core.core.logger import Logger


@flowsint_enricher
class DomainToWebsiteEnricher(Enricher):
    """From domain to website."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Domain
    OutputType = Website

    @classmethod
    def name(cls) -> str:
        return "domain_to_website"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []
        for domain in data:
            try:
                # Try HTTPS first
                try:
                    https_url = f"https://{domain.domain}"
                    response = requests.head(
                        https_url, timeout=10, allow_redirects=True
                    )
                    if response.status_code < 400:
                        results.append(Website(url=https_url, domain=domain, active=True))
                        continue
                except requests.RequestException:
                    pass

                # Try HTTP if HTTPS fails
                try:
                    http_url = f"http://{domain.domain}"
                    response = requests.head(http_url, timeout=10, allow_redirects=True)
                    if response.status_code < 400:
                        results.append(Website(url=http_url, domain=domain, active=True))
                        continue
                except requests.RequestException:
                    pass

                # If both fail, still add HTTPS URL as default
                results.append(Website(url=f"https://{domain.domain}", domain=domain, active=False))

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Error converting domain {domain.domain} to website: {e}"
                    },
                )
                # Add HTTPS URL as fallback
                results.append(Website(url=f"https://{domain.domain}", domain=domain, active=False))

        return results

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        for website in results:
            # Log each redirect step
            if website.redirects:
                for i, redirect_url in enumerate(website.redirects):
                    next_url = (
                        website.redirects[i + 1]
                        if i + 1 < len(website.redirects)
                        else str(website.url)
                    )
                    redirect_payload = {
                        "message": f"Redirect: {str(redirect_url)} -> {str(next_url)}"
                    }
                    Logger.info(self.sketch_id, redirect_payload)

            if self.neo4j_conn:
                # Create domain node
                self.create_node(website.domain)

                # Create website node
                self.create_node(website)

                # Create relationship
                self.create_relationship(website.domain, website, "HAS_WEBSITE")

            is_active_str = "active" if website.active else "inactive"
            redirects_str = (
                f" (redirects: {len(website.redirects)})" if website.redirects else ""
            )
            self.log_graph_message(
                f"{website.domain.domain} -> {str(website.url)} ({is_active_str}){redirects_str}"
            )

        return results


# Make types available at module level for easy access
InputType = DomainToWebsiteEnricher.InputType
OutputType = DomainToWebsiteEnricher.OutputType
