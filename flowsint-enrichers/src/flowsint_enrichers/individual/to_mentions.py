import os
from typing import Any, Dict, List, Optional

import requests

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_core.core.vault import VaultProtocol
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.individual import Individual
from flowsint_types.website import Website

SEARCH_ENDPOINT = "https://api.serply.io/v1/search/"
# `num` is an approximate cap of about ten rows per call, not an exact count, so
# the window size is fixed and surplus rows are trimmed against max_results.
PAGE_SIZE = 10
DEFAULT_MAX_RESULTS = 20


@flowsint_enricher
class IndividualToMentionsEnricher(Enricher):
    """[Serply] Find public pages that mention a person by name.

    Runs the full name as an exact-phrase query and emits one Website per
    organic result. Expects a `SERPLY_API_KEY` vault secret.
    """

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Individual
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
        return "individual_to_mentions"

    @classmethod
    def category(cls) -> str:
        return "Individual"

    @classmethod
    def key(cls) -> str:
        return "full_name"

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
                "name": "additional_terms",
                "type": "string",
                "description": "Extra words added to the query to disambiguate a common name, for example an employer or a city.",
                "required": False,
            },
            {
                "name": "max_results",
                "type": "number",
                "description": f"Maximum mentions per individual. Default: {DEFAULT_MAX_RESULTS}",
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
                    "message": f"(IndividualToMentions) Invalid max_results '{limit}', falling back to {DEFAULT_MAX_RESULTS}."
                },
            )
            return DEFAULT_MAX_RESULTS

    def _build_query(self, full_name: str) -> str:
        """Quote the name so the index matches the phrase, not the loose words.

        Without the quotes "Jane Doe" also matches a page carrying an unrelated
        Jane and an unrelated Doe, which is most of the noise on a name search.
        """
        query = f'"{full_name.strip()}"'
        extra = self.params.get("additional_terms")
        if extra and extra.strip():
            query = f"{query} {extra.strip()}"
        return query

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
                    "message": f"(IndividualToMentions) Search failed for '{query}' (HTTP {api_request.status_code}): {api_request.text}"
                },
            )
            return []

        return api_request.json().get("results") or []

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        api_key = self.get_secret("SERPLY_API_KEY", os.getenv("SERPLY_API_KEY"))
        max_results = self._max_results()

        for individual in data:
            full_name = individual.full_name
            if not full_name or not full_name.strip():
                Logger.warn(
                    self.sketch_id,
                    {
                        "message": "(IndividualToMentions) Skipping an individual with no full_name to search on."
                    },
                )
                continue

            try:
                query = self._build_query(full_name)
                mentions: List[Website] = []
                seen_links: set[str] = set()
                start = 0

                while len(mentions) < max_results:
                    rows = self._fetch_window(query, start, api_key)
                    if not rows:
                        break

                    before = len(mentions)
                    for row in rows:
                        link = row.get("link")
                        if not link or link in seen_links:
                            continue
                        seen_links.add(link)

                        try:
                            mention = Website(
                                url=link,
                                title=row.get("title"),
                                description=row.get("description"),
                            )
                        except Exception as e:
                            # The index occasionally returns links that are not
                            # addressable as an HTTP URL; skip those rows.
                            Logger.warn(
                                self.sketch_id,
                                {
                                    "message": f"(IndividualToMentions) Skipping unusable result '{link}': {e}"
                                },
                            )
                            continue

                        # Carry the source name through to postprocess for graph
                        # wiring, the way domain_to_dns threads its source domain.
                        setattr(mention, "_source_full_name", full_name)
                        mentions.append(mention)

                        if len(mentions) >= max_results:
                            break

                    # A window that adds nothing new means the result set is
                    # exhausted (or the offset stopped moving), so stop paging
                    # rather than spend a credit per duplicate window.
                    if len(mentions) == before:
                        break
                    start += PAGE_SIZE

                if not mentions:
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"(IndividualToMentions) No mention found for '{full_name}'."
                        },
                    )

                results.extend(mentions)

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"(IndividualToMentions) Exception while querying {full_name}: {e}"
                    },
                )

        return results

    def postprocess(
        self, results: List[OutputType], input_data: Optional[List[InputType]] = None
    ) -> List[OutputType]:
        if not self._graph_service:
            return results

        for mention in results:
            source_full_name = getattr(mention, "_source_full_name", None)
            if not source_full_name:
                continue

            individual = Individual(full_name=source_full_name)
            self.create_node(individual)
            self.create_node(mention)

            # A name on a page is evidence of a mention, not of ownership, so
            # this is deliberately not the HAS_WEBSITE edge a domain gets.
            self.create_relationship(individual, mention, "MENTIONED_IN")
            self.log_graph_message(
                f"(IndividualToMentions) {source_full_name} -> {str(mention.url)}"
            )

            # Clean up the temporary attribute used to thread context.
            delattr(mention, "_source_full_name")

        return results


# Make types available at module level for easy access
InputType = IndividualToMentionsEnricher.InputType
OutputType = IndividualToMentionsEnricher.OutputType
