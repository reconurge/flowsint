from typing import Any, Dict, List, Optional
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.website import Website
from flowsint_types.technology import Technology
from tools.network.httpx import HttpxTool


@flowsint_enricher
class TechDetectEnricher(Enricher):
    """[HTTPX] Detect web technologies on a website via httpx (wappalyzer)."""

    InputType = Website
    OutputType = Technology

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
        **kwargs,
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
        return "tech_detect"

    @classmethod
    def category(cls) -> str:
        return "Website"

    @classmethod
    def key(cls) -> str:
        return "website"

    @staticmethod
    def _parse_tech(entry: str) -> Optional[Technology]:
        """Turn an httpx tech entry into a Technology.

        httpx -td emits plain names ("nginx") and, when wappalyzer knows
        the version, "name:version" pairs ("PHP:8.1").
        """
        entry = (entry or "").strip()
        if not entry:
            return None
        name, sep, version = entry.partition(":")
        name = name.strip()
        if not name:
            return None
        return Technology(
            name=name,
            version=(version.strip() or None) if sep else None,
            source="httpx",
        )

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        try:
            httpx = HttpxTool()
        except Exception as e:
            Logger.error(
                self.sketch_id,
                {"message": f"[HTTPX] Failed to initialize httpx: {e}"},
            )
            return results

        for website in data:
            url = str(website.url)
            try:
                probes = httpx.launch(url, args=["-td"])
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"[HTTPX] Error probing {url}: {e}"},
                )
                continue

            seen: set[tuple[str, Optional[str]]] = set()
            for probe in probes:
                for entry in probe.get("tech", []) or []:
                    tech = self._parse_tech(entry)
                    if tech is None:
                        continue
                    dedup_key = (tech.name, tech.version)
                    if dedup_key in seen:
                        continue
                    seen.add(dedup_key)
                    # Carry the source website through to postprocess.
                    setattr(tech, "_source_url", url)
                    results.append(tech)
                    Logger.info(
                        self.sketch_id,
                        {"message": f"[HTTPX] {url} -> {tech.nodeLabel}"},
                    )

        return results

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType] = None
    ) -> List[OutputType]:
        for tech in results:
            if not self._graph_service:
                continue
            source_url = getattr(tech, "_source_url", None)
            if not source_url:
                continue

            website_obj = Website(url=source_url)
            self.create_node(website_obj)
            self.create_node(tech)
            self.create_relationship(website_obj, tech, "USES_TECHNOLOGY")
            self.log_graph_message(
                f"Technology {tech.nodeLabel} detected on {source_url}"
            )

            delattr(tech, "_source_url")

        return results


InputType = TechDetectEnricher.InputType
OutputType = TechDetectEnricher.OutputType
