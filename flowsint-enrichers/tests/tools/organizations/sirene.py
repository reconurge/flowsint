from typing import Dict
from tools.organizations.sirene import SireneTool

tool = SireneTool()


def test_name():
    assert tool.name() == "sirene"


def test_description():
    assert (
        tool.description()
        == "The Sirene API allows you to query the Sirene directory of businesses and establishments, managed by Insee."
    )


def test_category():
    assert tool.category() == "Business intelligence"


def test_launch_org():
    results = tool.launch("blablacar", 1)
    assert isinstance(results, list)
    assert all(isinstance(item, Dict) for item in results)


def test_launch_person():
    results = tool.launch("Karim+Terrache", 1)
    assert isinstance(results, list)
    assert all(isinstance(item, Dict) for item in results)


def test_launch_person_space_format():
    results = tool.launch("Karim Terrache", 1)
    assert isinstance(results, list)
    assert all(isinstance(item, Dict) for item in results)
