from typing import List, Union
from urllib.parse import urlparse
from flowsint_core.core.transform_base import Transform
from flowsint_types.website import Website
from flowsint_types.domain import Domain
from flowsint_core.core.logger import Logger


class WebsiteToDomainTransform(Transform):
    """From website to domain."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Website]
    OutputType = List[Domain]

    @classmethod
    def name(cls) -> str:
        return "website_to_domain"

    @classmethod
    def category(cls) -> str:
        return "Website"

    @classmethod
    def key(cls) -> str:
        return "website"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            website_obj = None
            if isinstance(item, str):
                website_obj = Website(url=item)
            elif isinstance(item, dict) and "url" in item:
                website_obj = Website(url=item["url"])
            elif isinstance(item, Website):
                website_obj = item
            if website_obj:
                cleaned.append(website_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
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
        self, results: OutputType, input_data: InputType = None
    ) -> OutputType:
        # Create Neo4j relationships between websites and their corresponding domains
        if input_data and self.neo4j_conn:
            for input_website, result in zip(input_data, results):
                website_url = str(input_website.url)
                domain_name = result.domain

                self.create_node(
                    "website",
                    "url",
                    website_url,
                    caption=website_url,
                    type="website",
                )
                
                # Create relationship with the specific domain for this website
                self.create_node(
                    "domain",
                    "domain",
                    domain_name,
                    caption=domain_name,
                    type="domain",
                )
                self.create_relationship(
                    "website",
                    "url",
                    website_url,
                    "domain",
                    "domain",
                    domain_name,
                    "HAS_DOMAIN",
                )
                self.log_graph_message(
                    f"Extracted domain {domain_name} from website {website_url}."
                )
        return results


# Make types available at module level for easy access
InputType = WebsiteToDomainTransform.InputType
OutputType = WebsiteToDomainTransform.OutputType
