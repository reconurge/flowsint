"""Argaam Arabic financial news enricher: Phrase (topic) -> Website mentions."""

from typing import Any, Dict, List, Optional, Union

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_types import Phrase, Website

from flowsint_enrichers.registry import flowsint_enricher
from tools.arabic_media.argaam import ArgaamTool


REL_LABEL = "MENTIONED_IN_ARGAAM"


@flowsint_enricher
class PhraseToArgaamEnricher(Enricher):
    """[ARGAAM] Searches argaam.com Arabic financial news for mentions of a topic/phrase."""

    InputType = Phrase
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
        return "phrase_to_argaam"

    @classmethod
    def category(cls) -> str:
        return "Phrase"

    @classmethod
    def key(cls) -> str:
        return "text"

    def preprocess(
        self, data: Union[List[str], List[dict], List[InputType]]
    ) -> List[InputType]:
        if not isinstance(data, list):
            raise ValueError(f"Expected list input, got {type(data).__name__}")
        cleaned: List[InputType] = []
        for item in data:
            if isinstance(item, str) and item.strip():
                cleaned.append(Phrase(text=item.strip()))
            elif isinstance(item, dict) and item.get("text"):
                cleaned.append(Phrase(**item))
            elif isinstance(item, Phrase):
                cleaned.append(item)
        if not cleaned:
            Logger.error(
                self.sketch_id,
                {"message": "[PHRASE_TO_ARGAAM] No valid Phrase inputs."},
            )
        return cleaned

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        tool = ArgaamTool()
        websites: List[OutputType] = []
        self._extracted = []
        for phrase in data:
            query = str(phrase.text)
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
                self._extracted.append({"phrase": phrase, "website": website})
        return websites

    def postprocess(
        self,
        results: List[OutputType],
        original_input: List[InputType],
    ) -> List[OutputType]:
        if not self._graph_service:
            return results

        seen_urls: set = set()
        seen_phrases: set = set()
        for item in self._extracted:
            phrase: Phrase = item["phrase"]
            website: Website = item["website"]
            url_str = str(website.url)
            if url_str in seen_urls:
                continue
            seen_urls.add(url_str)
            phrase_key = str(phrase.text)
            if phrase_key not in seen_phrases:
                self.create_node(phrase)
                seen_phrases.add(phrase_key)
            self.create_node(website)
            self.create_relationship(phrase, website, REL_LABEL)
            self.log_graph_message(
                f"Linked phrase '{phrase.text}' -[:{REL_LABEL}]-> {url_str}"
            )
        return results


InputType = PhraseToArgaamEnricher.InputType
OutputType = PhraseToArgaamEnricher.OutputType
