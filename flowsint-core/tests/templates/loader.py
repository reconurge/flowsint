import json

from flowsint_core.templates.loader.yaml_loader import YamlLoader
from flowsint_core.templates.types import Template


def test_yaml_loader():
    file = YamlLoader.get_template_from_file(
        "/Users/eliottmorcillo/Documents/Perso/projets/reconurge/flowsint/flowsint-core/tests/templates/example.yaml"
    )
    assert isinstance(file, Template)
    assert file.name == "shodan_ip_lookup"
    assert file.category == "Ip"

    print(json.dumps(file.model_dump(), indent=2, ensure_ascii=False))


def test_render_template():
    url_template = "http://ip-api.com/json/{{address}}"

    url = YamlLoader.render_template(url_template, {"address": "8.8.8.8"})

    assert url == "http://ip-api.com/json/8.8.8.8"
