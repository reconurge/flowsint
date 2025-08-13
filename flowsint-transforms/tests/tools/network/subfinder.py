import re
from tools.network.subfinder import SubfinderTool

tool = SubfinderTool()


def test_name():
    assert tool.name() == "subfinder"


def test_description():
    assert tool.description() == "Fast passive subdomain enumeration tool."


def test_category():
    assert tool.category() == "Subdomain enumeration"


def test_image():
    assert tool.get_image() == "projectdiscovery/subfinder"


def test_install():
    tool.install()
    assert tool.is_installed() == True


def test_version():
    tool.install()
    version = tool.version()
    # Check that version follows the expected format: v followed by digits and dots
    assert re.match(r"^v[\d\.]+$", version)


def test_launch():
    results = tool.launch("alliage.io")
    assert isinstance(results, list)
    assert all(isinstance(item, str) for item in results)
