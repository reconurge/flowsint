import re
from typing import Any

import yaml
from flowsint_types import TYPE_REGISTRY

from flowsint_core.templates.types import Template

TEMPLATE_RE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")
ALLOWED_METHODS = ["GET"]


class YamlLoader:
    @staticmethod
    def load_enricher_yaml(filename: str) -> dict[str, Any] | yaml.YAMLError:
        with open(filename) as stream:
            try:
                return yaml.safe_load(stream)
            except yaml.YAMLError as exc:
                return exc

    @staticmethod
    def parse_yaml_to_template(raw: dict[str, Any]) -> Template:
        if not isinstance(raw, dict):
            return
        input: dict | None = raw.get("input", None)

        if not input or not isinstance(input, dict):
            raise ValueError("Missing 'input' property in the yaml.")

        input_type: str | None = input.get("type", None)

        if not input_type:
            raise ValueError("Missing 'input_type' property in the yaml.")

        DetectedType = TYPE_REGISTRY.get(input_type)

        request = raw.get("request", {})
        method = request.get("method", None)

        if method not in ALLOWED_METHODS:
            raise ValueError(
                f"Method {method} not present in {', '.join(ALLOWED_METHODS)}"
            )

        if not DetectedType:
            raise ValueError(f"Type '{input_type}' not found in registry.")

        return Template(**raw)

    @staticmethod
    def get_template_from_file(filename: str) -> Template | None:
        template_dict = YamlLoader.load_enricher_yaml(filename)
        if not isinstance(template_dict, dict):
            return

        return YamlLoader.parse_yaml_to_template(template_dict)

    @staticmethod
    def render_template(template: str, values: dict[str, str]) -> str:
        def replace(match: re.Match) -> str:
            key = match.group(1)
            if key not in values:
                raise ValueError(f"Missing variable: {key}")
            return values[key]

        return TEMPLATE_RE.sub(replace, template)
