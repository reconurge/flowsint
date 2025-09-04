from pathlib import Path
from flowsint_transforms.socials.maigret import MaigretTransform
from flowsint_types.social import SocialProfile

transform = MaigretTransform("sketch_123", "scan_123")


def test_unprocessed_valid_usernames():
    usernames = [
        "toto123",
        "DorianXd78",
    ]
    result = transform.preprocess(usernames)
    result_usernames = [d for d in result]
    expected_usernames = [SocialProfile(username=d) for d in usernames]
    assert result_usernames == expected_usernames


def test_preprocess_invalid_usernames():
    usernames = [
        SocialProfile(username="toto123"),
        SocialProfile(username="DorianXd78_Official"),
        SocialProfile(username="This is not a username"),
    ]
    result = transform.preprocess(usernames)

    result_usernames = [d.username for d in result]
    assert "toto123" in result_usernames
    assert "DorianXd78_Official" in result_usernames
    assert "This is not a username" not in result_usernames


def test_preprocess_multiple_formats():
    usernames = [
        {"username": "toto123"},
        {"invalid_key": "ValId_UseRnAme"},
        SocialProfile(username="DorianXd78_Official"),
        "MySimpleUsername",
    ]
    result = transform.preprocess(usernames)

    result_usernames = [d.username for d in result]
    assert "toto123" in result_usernames
    assert "DorianXd78_Official" in result_usernames
    assert "ValId_UseRnAme" not in result_usernames
    assert "MySimpleUsername" in result_usernames


def test_parsing_invalid_output_file():
    results = transform.parse_maigret_output("toto123", Path("/this/path/does/not/exist"))
    assert results == []


def test_parsing():
    results = transform.parse_maigret_output("toto123", Path("/tmp/maigret_test.json"))
    print(results)
    assert len(results) == 2
