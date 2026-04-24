from typing import List, Union, Optional, Dict, Any
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_core.core.logger import Logger
from flowsint_types.website import Website
import requests
import os

@flowsint_enricher
class WebsiteToSubdomains(Enricher):
    """[c99.nl] Performs an automated scan to find subdomains of the given domain."""

    InputType = Website
    OutputType = Website

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        return [
            {
                "name": "C99_API_KEY",
                "type": "vaultSecret",
                "description": "Your C99.nl API key",
                "required": True,
            },
        ]

    @classmethod
    def name(cls) -> str:
        return "website_to_subdomains"

    @classmethod
    def category(cls) -> str:
        return "Website"

    @classmethod
    def key(cls) -> str:
        return "url"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results = []

        api_key = self.get_secret("C99_API_KEY", os.getenv("C99_API_KEY"))

        for website in data:
            try:
                api_request = requests.get(f'https://api.c99.nl/subdomainfinder?key={api_key}&domain={website.url}', timeout=30)

                if api_request.status_code != 200:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"(WebsiteToSubdomains) Enricher failed for '{website.url}': {api_request.text}"
                        },
                    )
                    continue

                response_json = api_request.json()

                for subdomain in response_json.get("subdomains", []):
                    url = subdomain.get("subdomain")
                    if website.url not in [f'http://{url}', f'https://{url}', f'http://www.{url}', f'https://www.{url}']:
                        ip = subdomain.get("ip")

                        cloudflare = []
                        if subdomain.get("cloudflare") is True:
                            cloudflare.append("Cloudflare")
                        else:
                            cloudflare = None

                        results.append(
                            Website(
                                url=f"http://{url}", description=f"IP address: {ip}", technologies=cloudflare
                            )
                        )

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"(WebsiteToSubdomains) Failed to run enricher for {website.url}: {e}"
                    },
                )

        return results

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        if not self._graph_service:
            return results

        for subdomain in results:
            try:
                self.create_node(subdomain)

                for url in original_input:
                    self.create_node(url)
                    self.create_relationship(url, subdomain, "IS_SUBDOMAIN")
                    self.log_graph_message(
                        f"(WebsiteToSubdomains) Found {url.url}'s subdomain - '{subdomain.url}'"
                    )

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"(WebsiteToSubdomains) relationship error: {e}"
                    },
                )

        return results

InputType = WebsiteToSubdomains.InputType
OutputType = WebsiteToSubdomains.OutputType