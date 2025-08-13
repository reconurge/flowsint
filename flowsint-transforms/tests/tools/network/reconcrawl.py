from tools.network.reconcrawl import ReconCrawlTool

tool = ReconCrawlTool()


def test_name():
    assert tool.name() == "reconcrawl"


def test_description():
    assert (
        tool.description()
        == "Emails and phone numbers crawler from websites by analyzing their HTML and embedded scripts."
    )


def test_category():
    assert tool.category() == "Crawler"


def test_install():
    tool.install()
    assert tool.is_installed() == True
