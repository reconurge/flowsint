"""Argaam Arabic financial news enricher: Individual -> Website mentions."""

from typing import Any, Dict, List, Optional, Union

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_types import Individual, Website

from flowsint_enrichers.registry import flowsint_enricher
from tools.arabic_media.argaam import ArgaamTool


REL_LABEL = "MENTIONED_IN_ARGAAM"


@flowsint_enricher
class IndividualToArgaamEnricher(Enricher):
    """[ARGAAM] Searches argaam.com Arabic financial news for mentions of an individual."""

    InputType = Individual
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
        self._extracted: List[Dict[str, Any]] = []

    @classmethod
    def name(cls) -> str:
        return "individual_to_argaam"

    @classmethod
    def category(cls) -> str:
        return "Individual"

    @classmethod
    def key(cls) -> str:
        return "full_name"

    def preprocess(
        self, data: Union[List[str], List[dict], List[InputType]]
    ) -> List[InputType]:
        if not isinstance(data, list):
            raise ValueError(f"Expected list input, got {type(data).__name__}")
        cleaned: List[InputType] = []
        for item in data:
            if isinstance(item, str):
                parts = item.strip().split()
                if len(parts) >= 2:
                    cleaned.append(
                        Individual(
                            first_name=parts[0],
                            last_name=" ".join(parts[1:]),
                            full_name=item,
                        )
                    )
            elif isinstance(item, dict) and item.get("full_name"):
                cleaned.append(Individual(**item))
            elif isinstance(item, Individual):
                cleaned.append(item)
        if not cleaned:
            Logger.error(
                self.sketch_id,
                {"message": "[INDIVIDUAL_TO_ARGAAM] No valid Individual inputs."},
            )
        return cleaned

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        tool = ArgaamTool()
        websites: List[OutputType] = []
        self._extracted = []
        for individual in data:
            query = individual.full_name
            if not query:
                continue
            try:
                hits = tool.launch(query)
            except Exception as exc:
                Logger.error(
                    self.sketch_id,
                    {"message": f"[ARGAAM] error for '{query}': {exc}"},
                )
                continue
            for hit in hits:
                website = Website(
                    url=hit["url"],
                    title=hit.get("title"),
                    description=hit.get("snippet"),
                )
                websites.append(website)
                self._extracted.append({"individual": individual, "website": website})
        return websites

    def postprocess(
        self,
        results: List[OutputType],
        original_input: List[InputType],
    ) -> List[OutputType]:
        if not self._graph_service:
            return results

        seen_urls: set = set()
        seen_individuals: set = set()
        for item in self._extracted:
            individual: Individual = item["individual"]
            website: Website = item["website"]
            url_str = str(website.url)
            if url_str in seen_urls:
                continue
            seen_urls.add(url_str)
            if individual.full_name not in seen_individuals:
                self.create_node(individual)
                seen_individuals.add(individual.full_name)
            self.create_node(website)
            self.create_relationship(individual, website, REL_LABEL)
            self.log_graph_message(
                f"Linked {individual.full_name} -[:{REL_LABEL}]-> {url_str}"
            )
        return results


InputType = IndividualToArgaamEnricher.InputType
OutputType = IndividualToArgaamEnricher.OutputType
