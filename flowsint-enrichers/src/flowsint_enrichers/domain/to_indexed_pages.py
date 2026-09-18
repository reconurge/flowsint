import os
from typing import Any, Dict, List, Optional

import requests

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_core.core.vault import VaultProtocol
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.domain import Domain
from flowsint_types.website import Website

SEARCH_ENDPOINT = "https://api.serply.io/v1/search/"
# `num` is an approximate cap of about ten rows per call, not an exact count, so
# the window size is fixed and surplus rows are trimmed against max_results.
PAGE_SIZE = 10
DEFAULT_MAX_RESULTS = 20


@flowsint_enricher
class DomainToIndexedPagesEnricher(Enricher):
    """[Serply] List the pages a search engine has indexed for a domain.

    Runs a `site:<domain>` query and emits one Website per organic result.
    Expects a `SERPLY_API_KEY` vault secret.
    """

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Domain
    OutputType = Website

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault: Optional[VaultProtocol] = None,
        params: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
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
        return "domain_to_indexed_pages"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare required parameters for this enricher"""
        return [
            {
                "name": "SERPLY_API_KEY",
                "type": "vaultSecret",
                "description": "Your Serply API key, from serply.io.",
                "required": True,
            },
            {
                "name": "max_results",
                "type": "number",
                "description": f"Maximum indexed pages per domain. Default: {DEFAULT_MAX_RESULTS}",
                "required": False,
            },
        ]

    def _max_results(self) -> int:
        limit = self.params.get("max_results")
        if limit is None:
            return DEFAULT_MAX_RESULTS
        try:
            return max(1, int(limit))
        except (TypeError, ValueError):
            Logger.warn(
                self.sketch_id,
                {
                    "message": f"(DomainToIndexedPages) Invalid max_results '{limit}', falling back to {DEFAULT_MAX_RESULTS}."
                },
            )
            return DEFAULT_MAX_RESULTS

    def _fetch_window(
        self, query: str, start: int, api_key: str
    ) -> List[Dict[str, Any]]:
        """Fetch one result window. `start` is the only offset the API honours."""
        query_params: Dict[str, str | int] = {
            "q": query,
            "num": PAGE_SIZE,
            "start": start,
        }
        api_request = requests.get(
            SEARCH_ENDPOINT,
            params=query_params,
            headers={
                "X-Api-Key": api_key,
                "Accept": "application/json",
                "User-Agent": "FlowsInt-Enricher",
            },
            timeout=30,
        )

        if api_request.status_code != 200:
            Logger.error(
                self.sketch_id,
                {
                    "message": f"(DomainToIndexedPages) Search failed for '{query}' (HTTP {api_request.status_code}): {api_request.text}"
                },
            )
            return []

        return api_request.json().get("results") or []

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        api_key = self.get_secret("SERPLY_API_KEY", os.getenv("SERPLY_API_KEY"))
        max_results = self._max_results()

        for domain in data:
            try:
                pages: List[Website] = []
                seen_links: set[str] = set()
                start = 0

                while len(pages) < max_results:
                    rows = self._fetch_window(f"site:{domain.domain}", start, api_key)
                    if not rows:
                        break

                    before = len(pages)
                    for row in rows:
                        link = row.get("link")
                        if not link or link in seen_links:
                            continue
                        seen_links.add(link)

                        try:
                            pages.append(
                                Website(
                                    url=link,
                                    domain=domain,
                                    title=row.get("title"),
                                    description=row.get("description"),
                                )
                            )
                        except Exception as e:
                            # The index occasionally returns links that are not
                            # addressable as an HTTP URL; skip those rows.
                            Logger.warn(
                                self.sketch_id,
                                {
                                    "message": f"(DomainToIndexedPages) Skipping unusable result '{link}': {e}"
                                },
                            )

                        if len(pages) >= max_results:
                            break

                    # A window that adds nothing new means the result set is
                    # exhausted (or the offset stopped moving), so stop paging
                    # rather than spend a credit per duplicate window.
                    if len(pages) == before:
                        break
                    start += PAGE_SIZE

                if not pages:
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"(DomainToIndexedPages) No indexed page found for '{domain.domain}'."
                        },
                    )

                results.extend(pages)

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"(DomainToIndexedPages) Exception while querying {domain.domain}: {e}"
                    },
                )

        return results

    def postprocess(
        self, results: List[OutputType], input_data: Optional[List[InputType]] = None
    ) -> List[OutputType]:
        if not self._graph_service:
            return results

        for website in results:
            if website.domain is None:
                continue

            self.create_node(website.domain)
            self.create_node(website)

            # Same edge domain_to_website uses, so an indexed page lands in the
            # existing domain-to-page view instead of a parallel one.
            self.create_relationship(website.domain, website, "HAS_WEBSITE")
            self.log_graph_message(
                f"(DomainToIndexedPages) {website.domain.domain} -> {str(website.url)}"
            )

        return results


# Make types available at module level for easy access
InputType = DomainToIndexedPagesEnricher.InputType
OutputType = DomainToIndexedPagesEnricher.OutputType
