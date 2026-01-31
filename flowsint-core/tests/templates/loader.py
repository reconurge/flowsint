import json
from pathlib import Path

import pytest

from flowsint_core.templates.loader.yaml_loader import YamlLoader
from flowsint_core.templates.types import Template

TEST_DIR = Path(__file__).parent


def test_yaml_loader():
    file = YamlLoader.get_template_from_file(str(TEST_DIR / "example.yaml"))
    assert isinstance(file, Template)
    assert file.name == "shodan_ip_lookup"
    assert file.category == "Ip"

    print(json.dumps(file.model_dump(), indent=2, ensure_ascii=False))


def test_render_template():
    url_template = "http://ip-api.com/json/{{address}}"

    url = YamlLoader.render_template(url_template, {"address": "8.8.8.8"})

    assert url == "http://ip-api.com/json/8.8.8.8"


def test_render_template_2():
    url_template = "http://ip-api.com/json?ip={{address}}&domain={{domain}}"

    url = YamlLoader.render_template(
        url_template, {"address": "8.8.8.8", "domain": "mydomain.com"}
    )

    assert url == "http://ip-api.com/json?ip=8.8.8.8&domain=mydomain.com"
    print(url)


def test_invalid_method():
    with pytest.raises(ValueError) as exc_info:
        YamlLoader.get_template_from_file(str(TEST_DIR / "example-invalid.yaml"))

    assert "not present in" in str(exc_info.value).lower()
