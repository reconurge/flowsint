from typing import List, Union
from urllib.parse import urlparse
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.website import Website
from flowsint_types.domain import Domain
from flowsint_core.core.logger import Logger


@flowsint_enricher
class WebsiteToDomainEnricher(Enricher):
    """From website to domain."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Website
    OutputType = Domain

    @classmethod
    def name(cls) -> str:
        return "website_to_domain"

    @classmethod
    def category(cls) -> str:
        return "Website"

    @classmethod
    def key(cls) -> str:
        return "website"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []
        for website in data:
            try:
                parsed_url = urlparse(str(website.url))
                domain_name = parsed_url.netloc

                # Remove port if present
                if ":" in domain_name:
                    domain_name = domain_name.split(":")[0]

                # Remove www. prefix if present
                if domain_name.startswith("www."):
                    domain_name = domain_name[4:]

                if domain_name:
                    domain_obj = Domain(domain=domain_name)
                    results.append(domain_obj)

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Error extracting domain from website {str(website.url)}: {e}"
                    },
                )
                continue

        return results

    def postprocess(
        self, results: List[OutputType], input_data: List[InputType] = None
    ) -> List[OutputType]:
        # Create Neo4j relationships between websites and their corresponding domains
        if input_data and self._graph_service:
            for input_website, result in zip(input_data, results):
                website_url = str(input_website.url)
                domain_name = result.domain

                self.create_node(input_website)

                # Create relationship with the specific domain for this website
                self.create_node(result)
                self.create_relationship(input_website, result, "HAS_DOMAIN")
                self.log_graph_message(
                    f"Extracted domain {domain_name} from website {website_url}."
                )
        return results


# Make types available at module level for easy access
InputType = WebsiteToDomainEnricher.InputType
OutputType = WebsiteToDomainEnricher.OutputType
