import pytest
from app.scanners.usernames.sherlock import SherlockScanner

SCAN_ID = "1234567890"
VALID_USERNAME = "toto123"
INVALID_USERNAME = "Wow this is wrong #@!$"

@pytest.fixture
def scanner():
    return SherlockScanner(SCAN_ID)

def test_name(scanner):
    assert scanner.name() == "sherlock_scanner"

def test_category(scanner):
    assert scanner.category() == "social_account"

def test_key(scanner):
    assert scanner.key() == "username"

def test_input_schema(scanner):
    assert scanner.input_schema() == {"usernames": "array"}

def test_output_schema(scanner):
    assert "output" in scanner.output_schema()

@pytest.mark.skipif(True, reason="Skip long-running test")
def test_scan_valid_username(scanner):
    results = scanner.execute(VALID_USERNAME)
    assert isinstance(results.get("output", []), dict)

def test_postprocess(scanner):
    raw_results = {
        "x.com":"https://x.com/toto123",
        "music.yandex":"https://music.yandex/users/toto123/playlists",
        "www.smule.com":"https://www.smule.com/toto123"
    }
    
    enriched = scanner.postprocess(raw_results)
    assert isinstance(enriched["output"], dict)



