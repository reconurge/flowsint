import re
from typing import Dict
from tools.network.asnmap import AsnmapTool

tool = AsnmapTool()


def test_name():
    assert tool.name() == "asnmap"


def test_description():
    assert tool.description() == "ASN mapping and network reconnaissance tool."


def test_category():
    assert tool.category() == "ASN discovery"


def test_image():
    assert tool.get_image() == "projectdiscovery/asnmap"


def test_install():
    tool.install()
    assert tool.is_installed() == True


def test_version():
    tool.install()
    version = tool.version()
    # Check that version follows the expected format: v followed by digits and dots
    assert re.match(r"^v[\d\.]+$", version)


def test_launch_no_api_key():
    import pytest

    with pytest.raises(KeyError, match="Missing key"):
        tool.launch("alliage.io", "domain")


def test_launch_wrong_type():
    import pytest

    with pytest.raises(ValueError, match="Invalid type: 'domains'"):
        tool.launch("alliage.io", "domains")


def test_launch():
    results = tool.launch("alliage.io", "domain")
    assert isinstance(results, Dict)
