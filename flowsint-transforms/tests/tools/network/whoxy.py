from tools.network.whoxy import WhoxyTool

tool = WhoxyTool()


def test_name():
    assert tool.name() == "whoxy"


def test_description():
    assert (
        tool.description()
        == "The WHOIS API returns consistent and well-structured WHOIS data in XML & JSON format. Returned data contain parsed WHOIS fields that can be easily understood. Along with WHOIS API, Whoxy also offer WHOIS History API and Reverse WHOIS API."
    )


def test_category():
    assert tool.category() == "Network intelligence"
