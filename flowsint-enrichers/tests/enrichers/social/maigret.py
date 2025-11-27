from pathlib import Path
from flowsint_enrichers.socials.maigret import MaigretEnricher
from flowsint_types.social import SocialAccount

enricher = MaigretEnricher("sketch_123", "scan_123")


def test_unprocessed_valid_usernames():
    usernames = [
        "toto123",
        "DorianXd78",
    ]
    result = enricher.preprocess(usernames)
    result_usernames = [d for d in result]
    expected_usernames = [SocialAccount(username=d) for d in usernames]
    assert result_usernames == expected_usernames


def test_preprocess_invalid_usernames():
    usernames = [
        SocialAccount(username="toto123"),
        SocialAccount(username="DorianXd78_Official"),
        SocialAccount(username="This is not a username"),
    ]
    result = enricher.preprocess(usernames)

    result_usernames = [d.username for d in result]
    assert "toto123" in result_usernames
    assert "DorianXd78_Official" in result_usernames
    assert "This is not a username" not in result_usernames


def test_preprocess_multiple_formats():
    usernames = [
        {"username": "toto123"},
        {"invalid_key": "ValId_UseRnAme"},
        SocialAccount(username="DorianXd78_Official"),
        "MySimpleUsername",
    ]
    result = enricher.preprocess(usernames)

    result_usernames = [d.username for d in result]
    assert "toto123" in result_usernames
    assert "DorianXd78_Official" in result_usernames
    assert "ValId_UseRnAme" not in result_usernames
    assert "MySimpleUsername" in result_usernames


def test_parsing_invalid_output_file():
    results = enricher.parse_maigret_output("toto123", Path("/this/path/does/not/exist"))
    assert results == []


def test_parsing():
    results = enricher.parse_maigret_output("toto123", Path("/tmp/maigret_test.json"))
    print(results)
    assert len(results) == 2
