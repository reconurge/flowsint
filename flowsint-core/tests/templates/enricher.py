"""Legacy test file - tests moved to test_template_enricher.py"""

# This file is kept for backwards compatibility
# All tests have been moved to test_template_enricher.py
# with proper mocking and more comprehensive coverage

from pathlib import Path

import pytest

from flowsint_core.core.template_enricher import TemplateEnricher
from flowsint_core.templates.loader.yaml_loader import YamlLoader
from flowsint_core.templates.types import Template

TEST_DIR = Path(__file__).parent


def test_enricher_init():
    """Test basic enricher initialization from YAML template."""
    template = YamlLoader.get_template_from_file(str(TEST_DIR / "example.yaml"))

    assert isinstance(template, Template)
    assert template.name == "ip-api-lookup"
    assert template.category == "Ip"

    enricher = TemplateEnricher(sketch_id="123", scan_id="123", template=template)
    assert enricher.name() == "ip-api-lookup"
    assert enricher.category() == "Ip"
    assert enricher.key() == "address"


def test_enricher_preprocess():
    """Test enricher preprocessing converts strings to typed objects."""
    template = YamlLoader.get_template_from_file(str(TEST_DIR / "example.yaml"))
    enricher = TemplateEnricher(sketch_id="123", scan_id="123", template=template)

    pre = enricher.preprocess(["8.8.8.8"])
    assert len(pre) == 1
    assert hasattr(pre[0], "address")
    assert pre[0].address == "8.8.8.8"
