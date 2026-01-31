from pathlib import Path

import pytest

from flowsint_core.core.template_enricher import TemplateEnricher
from flowsint_core.templates.loader.yaml_loader import YamlLoader
from flowsint_core.templates.types import Template

TEST_DIR = Path(__file__).parent


@pytest.mark.asyncio
async def test_enricher_params():
    template = YamlLoader.get_template_from_file(str(TEST_DIR / "example.yaml"))

    assert isinstance(template, Template)
    assert template.name == "ip-api-lookup"
    assert template.category == "Ip"
    enricher = TemplateEnricher(sketch_id="123", scan_id="123", template=template)
    pre = enricher.preprocess(["8.8.8.8"])
    scans = await enricher.scan(pre)
    print(scans)
    assert enricher
