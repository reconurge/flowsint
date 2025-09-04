from typing import List, Union
from urllib.parse import urlparse
from flowsint_core.core.transform_base import Transform
from flowsint_types.website import Website
from flowsint_core.core.logger import Logger
from reconspread import Crawler


class WebsiteToLinks(Transform):
    """From website to spread crawler that extracts domains and internal/external links."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Website]
    OutputType = List[Website]

    @classmethod
    def name(cls) -> str:
        return "website_to_links"

    @classmethod
    def category(cls) -> str:
        return "Website"

    @classmethod
    def key(cls) -> str:
        return "url"

    def extract_domain(self, url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed_url = urlparse(url)
            return parsed_url.netloc
        except Exception:
            return ""

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
        """Crawl websites using reconspread to extract internal and external links."""
        results = []

        for website in data:
            try:
                Logger.info(
                    self.sketch_id,
                    {"message": f"Starting reconspread crawl of {str(website.url)}"},
                )

                # Extract main domain from input website (needed in callback)
                main_domain = self.extract_domain(str(website.url))

                # Create main website and domain nodes upfront
                if self.neo4j_conn:
                    self.create_node(
                        "website",
                        "url",
                        str(website.url),
                        caption=str(website.url),
                        type="website",
                    )
                    if main_domain:
                        self.create_node(
                            "domain",
                            "name",
                            main_domain,
                            caption=main_domain,
                            type="domain",
                        )
                        self.create_relationship(
                            "website",
                            "url",
                            str(website.url),
                            "domain",
                            "name",
                            main_domain,
                            "BELONGS_TO_DOMAIN",
                        )
                        self.log_graph_message(
                            f"Website {str(website.url)} belongs to domain {main_domain}"
                        )

                # Store discovered URLs
                internal_urls = []
                external_urls = []
                external_domains = set()

                def url_handler(url, is_external=False):
                    """Custom callback to handle URLs as they're discovered."""
                    if is_external:
                        external_urls.append(url)
                        domain = self.extract_domain(url)
                        if domain:
                            external_domains.add(domain)
                            # Create external website node immediately
                            if self.neo4j_conn:
                                self.create_node(
                                    "website", "url", url, caption=url, type="website"
                                )
                                self.create_relationship(
                                    "website",
                                    "url",
                                    str(website.url),
                                    "website",
                                    "url",
                                    url,
                                    "LINKS_TO",
                                )
                                self.log_graph_message(
                                    f"Website {str(website.url)} links to external website {url}"
                                )

                                # Create external domain node and link external website to its domain
                                if domain != main_domain:
                                    self.create_node(
                                        "domain",
                                        "name",
                                        domain,
                                        caption=domain,
                                        type="domain",
                                    )
                                    self.create_relationship(
                                        "website",
                                        "url",
                                        url,
                                        "domain",
                                        "name",
                                        domain,
                                        "BELONGS_TO_DOMAIN",
                                    )
                                    self.create_relationship(
                                        "website",
                                        "url",
                                        str(website.url),
                                        "domain",
                                        "name",
                                        domain,
                                        "LINKS_TO_DOMAIN",
                                    )
                                    self.log_graph_message(
                                        f"External website {url} belongs to domain {domain}"
                                    )
                                    self.log_graph_message(
                                        f"Website {str(website.url)} links to external domain {domain}"
                                    )
                        Logger.info(
                            self.sketch_id,
                            {"message": f"[EXTERNAL] Found: {url} -> Domain: {domain}"},
                        )
                    else:
                        internal_urls.append(url)
                        # Create internal website node immediately
                        if self.neo4j_conn and url != str(
                            website.url
                        ):  # Don't create duplicate of main website
                            self.create_node(
                                "website", "url", url, caption=url, type="website"
                            )
                            self.create_relationship(
                                "website",
                                "url",
                                str(website.url),
                                "website",
                                "url",
                                url,
                                "LINKS_TO",
                            )
                            self.log_graph_message(
                                f"Website {str(website.url)} links to internal website {url}"
                            )

                            # Also link internal websites to main domain
                            if main_domain:
                                self.create_relationship(
                                    "website",
                                    "url",
                                    url,
                                    "domain",
                                    "name",
                                    main_domain,
                                    "BELONGS_TO_DOMAIN",
                                )
                        Logger.info(
                            self.sketch_id, {"message": f"[INTERNAL] Found: {url}"}
                        )

                # Create crawler with custom callback
                crawler = Crawler(
                    url=str(website.url),
                    recursive=True,
                    same_domain_only=False,
                    verbose=False,  # Disable default verbose output
                    _on_result_callback=url_handler,  # Use our custom handler
                )

                # Perform the crawl
                crawler.fetch()
                crawler.extract_urls()

                # Get final results (backup in case callback missed anything)
                crawl_results = crawler.get_results()

                # Ensure we have all internal URLs
                for url in crawl_results.internal:
                    if url not in internal_urls:
                        internal_urls.append(url)

                # Ensure we have all external URLs and domains
                for url in crawl_results.external:
                    if url not in external_urls:
                        external_urls.append(url)
                        domain = self.extract_domain(url)
                        if domain:
                            external_domains.add(domain)

                website_result = {
                    "website": str(website.url),
                    "main_domain": main_domain,
                    "internal_urls": internal_urls,
                    "external_urls": external_urls,
                    "external_domains": list(external_domains),
                }

                # Log results
                Logger.info(
                    self.sketch_id,
                    {
                        "message": f"Spread crawl completed for {str(website.url)}: "
                        f"Main domain: {main_domain}, "
                        f"{len(internal_urls)} internal URLs, "
                        f"{len(external_urls)} external URLs, "
                        f"{len(external_domains)} external domains found."
                    },
                )

                results.append(website_result)

            except Exception as e:
                # Log error but continue with other websites
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error crawling {str(website.url)}: {str(e)}"},
                )

                # Still create main website and domain nodes even on error
                main_domain = self.extract_domain(str(website.url))
                if self.neo4j_conn:
                    self.create_node(
                        "website",
                        "url",
                        str(website.url),
                        caption=str(website.url),
                        type="website",
                    )
                    if main_domain:
                        self.create_node(
                            "domain",
                            "name",
                            main_domain,
                            caption=main_domain,
                            type="domain",
                        )
                        self.create_relationship(
                            "website",
                            "url",
                            str(website.url),
                            "domain",
                            "name",
                            main_domain,
                            "BELONGS_TO_DOMAIN",
                        )
                        self.log_graph_message(
                            f"Website {str(website.url)} belongs to domain {main_domain}"
                        )

                # Add empty result for failed website
                results.append(
                    {
                        "website": str(website.url),
                        "main_domain": main_domain,
                        "internal_urls": [],
                        "external_urls": [],
                        "external_domains": [],
                    }
                )
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Neo4j nodes and relationships are created in real-time during the callback
        # No additional processing needed here
        return results


InputType = WebsiteToLinks.InputType
OutputType = WebsiteToLinks.OutputType
