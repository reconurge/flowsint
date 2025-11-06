from typing import List, Union
import requests
from flowsint_core.utils import is_valid_domain
from flowsint_core.core.transform_base import Transform
from flowsint_types.domain import Domain
from flowsint_types.website import Website
from flowsint_core.core.logger import Logger


class DomainToWebsiteTransform(Transform):
    """From domain to website."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Domain]
    OutputType = List[Website]

    @classmethod
    def name(cls) -> str:
        return "domain_to_website"

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

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
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
                self.create_node(
                    "domain", "domain", website.domain.domain, type="domain"
                )

                # Create website node
                self.create_node(
                    "website",
                    "url",
                    str(website.url),
                    active=website.active,
                    redirects=(
                        [str(redirect) for redirect in website.redirects]
                        if website.redirects
                        else []
                    ),
                    type="website",
                )

                # Create relationship
                self.create_relationship(
                    "domain",
                    "domain",
                    website.domain.domain,
                    "website",
                    "url",
                    str(website.url),
                    "HAS_WEBSITE",
                )

            is_active_str = "active" if website.active else "inactive"
            redirects_str = (
                f" (redirects: {len(website.redirects)})" if website.redirects else ""
            )
            self.log_graph_message(
                f"{website.domain.domain} -> {str(website.url)} ({is_active_str}){redirects_str}"
            )

        return results


# Make types available at module level for easy access
InputType = DomainToWebsiteTransform.InputType
OutputType = DomainToWebsiteTransform.OutputType
