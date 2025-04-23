import pytest
from app.scanners.phones.ignorant import IgnorantScanner

SCAN_ID = "1234567890"
VALID_PHONE_NUMBER = "0621218225"
INVALID_PHONE_NUMBER = "WHAT IS THIS #@!$"

@pytest.fixture
def scanner():
    return IgnorantScanner(SCAN_ID)

def test_name(scanner):
    assert scanner.name() == "ignorant_scanner"

def test_category(scanner):
    assert scanner.category() == "phones"

def test_key(scanner):
    assert scanner.key() == "phone_number"

@pytest.mark.skipif(True, reason="Skip long-running test")
def test_scan_valid_username(scanner):
    results = scanner.execute([VALID_PHONE_NUMBER])
    assert isinstance(results.get("output", {}), dict)

def test_postprocess(scanner):
    raw_results = []
    enriched = scanner.postprocess(raw_results)
    assert isinstance(enriched.get("output", {}), dict)
