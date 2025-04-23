import pytest
from app.scanners.usernames.maigret import MaigretScanner

SCAN_ID = "1234567890"
VALID_USERNAME = "toto123"
INVALID_USERNAME = "Wow this is wrong #@!$"

@pytest.fixture
def scanner():
    return MaigretScanner(SCAN_ID)

def test_name(scanner):
    assert scanner.name() == "maigret_scanner"

def test_category(scanner):
    assert scanner.category() == "social_account"

def test_key(scanner):
    assert scanner.key() == "username"

@pytest.mark.skipif(True, reason="Skip long-running test")
def test_scan_valid_username(scanner):
    results = scanner.execute([VALID_USERNAME])
    assert isinstance(results.get("output", {}), dict)

def test_postprocess(scanner):
    raw_results = { 
            "BikeRadar": {
            "rank": 14858,
            "site": {
                "url": "https://forum.bikeradar.com/profile/{username}",
                "tags": [
                    "forum",
                    "gb",
                    "us"
                ],
                "urlMain": "https://forum.bikeradar.com",
                "alexaRank": 14858,
                "checkType": "status_code",
                "usernameClaimed": "adam",
                "usernameUnclaimed": "noonewouldeverusethis7"
            }}}
    
    enriched = scanner.postprocess(raw_results)
    assert isinstance(enriched["output"], dict)


