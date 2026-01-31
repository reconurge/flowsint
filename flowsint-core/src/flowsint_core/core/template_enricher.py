"""
This is the base class for the enricher from a template.
This enricher takes a yaml template as input, that describes the expected behaviour.
For now, this is only limited to straightforward http GET requests, with minimal params/payloads.

It does support usage of third party api keys, using the Vault system, just like any other enricher.
"""

from typing import Any, Dict, List, Optional

import requests
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types import FlowsintType, get_type

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_core.templates.loader.yaml_loader import YamlLoader
from flowsint_core.templates.types import Template


class TemplateEnricher(Enricher):
    """Resolve domain names to IP addresses."""

    InputType = FlowsintType
    OutputType = FlowsintType

    def __init__(
        self,
        template: Template,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            vault=vault,
            params=params,
        )
        self.template = template
        self.params_schema = self.get_params_schema()
        self.InputType = self._detect_type(self.template.input.type)
        self.OutputType = self._detect_type(self.template.output.type)
        self.request = self.template.request

    def _detect_type(self, inputType: str) -> type[FlowsintType]:
        DetectedType = get_type(inputType)
        if not DetectedType:
            raise TypeError(f"Type {inputType} is not present in registry.")
        return DetectedType

    def name(self) -> str:  # type: ignore[override]
        return self.template.name

    def category(self) -> str:  # type: ignore[override]
        return self.template.category

    def key(self) -> str:  # type: ignore[override]
        return self.template.input.key

    @classmethod
    def documentation(cls) -> str:
        """Return formatted markdown documentation for the domain resolver enricher."""
        return ""

    def _build_mapped_result(self, result: dict) -> Any:
        mappings = self.template.response.map

        # build object from mapping, as raw dict
        output_dict = {}
        for key, value in mappings.items():
            output_dict[key] = result.get(value)

        return self.OutputType(**output_dict)

    async def scan(self, values: List[Any]) -> List[Any]:
        results: List[Any] = []
        req = self.request
        # the key used to match the formatted string
        key = self.template.input.key

        if not key:
            raise Exception(
                f"Key is missing for intput type {self.template.input.type}."
            )

        for d in values:
            url = YamlLoader.render_template(req.url, {key: getattr(d, key)})
            print(url)
            try:
                resp = requests.get(
                    url,
                    params=req.params,
                    timeout=10,
                )
                resp.raise_for_status()
                data = resp.json()

                results.append(self._build_mapped_result(data))
            except Exception as e:
                Logger.info(
                    self.sketch_id,
                    {"message": f"Error resolving {req.url}: {e}"},
                )
                continue
        return results

    def postprocess(self, results: List[Any], input_data: List[Any] = []) -> List[Any]:
        for res in results:
            self.log_graph_message(f"Resolved {self.request.url} -> {res.model_dump()}")
        return results


InputType = TemplateEnricher.InputType
OutputType = TemplateEnricher.OutputType
