import re
from typing import List
from tools.network.httpx import HttpxTool

tool = HttpxTool()


def test_name():
    assert tool.name() == "httpx"


def test_description():
    assert (
        tool.description()
        == "An HTTP toolkit that probes services, web servers, and other valuable metadata."
    )


def test_category():
    assert tool.category() == "Web technologies enumeration"


def test_image():
    assert tool.get_image() == "projectdiscovery/httpx"


def test_install():
    tool.install()
    assert tool.is_installed() == True


def test_version():
    tool.install()
    version = tool.version()
    # Check that version follows the expected format: v followed by digits and dots
    assert re.match(r"^v[\d\.]+$", version)


def test_launch():
    assert True
    results = tool.launch("https://alliage.io")
    print(results)
    assert isinstance(results, List)


def test_launch_unreached_host():
    assert True
    results = tool.launch("https://this-is-not-a-valid-domain.local")
    assert isinstance(results, List)
    assert len(results) == 0
