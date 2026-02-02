"""Legacy test file - tests moved to test_loader.py"""

# This file is kept for backwards compatibility
# All tests have been moved to test_loader.py
# with more comprehensive coverage

from pathlib import Path

from flowsint_core.templates.loader.yaml_loader import YamlLoader
from flowsint_core.templates.types import Template

TEST_DIR = Path(__file__).parent


def test_yaml_loader_basic():
    """Basic YAML loading test."""
    file = YamlLoader.get_template_from_file(str(TEST_DIR / "example.yaml"))
    assert isinstance(file, Template)
    assert file.name == "ip-api-lookup"
