import pytest
from app.scanners.domains.domain_infos import DomainInfosScanner

SCAN_ID = "1234567890"
VALID_DOMAIN = "example.com"
INVALID_DOMAIN = "thisisnotadomain"

@pytest.fixture
def scanner():
    return DomainInfosScanner(SCAN_ID)

def test_name(scanner):
    assert scanner.name() == "domain_infos_scanner"

def test_category(scanner):
    assert scanner.category() == "websites"

def test_key(scanner):
    assert scanner.key() == "url"

def test_input_schema(scanner):
    assert scanner.input_schema() == {"domains": "array"}

def test_output_schema(scanner):
    assert "output" in scanner.output_schema()

@pytest.mark.skipif(True, reason="Skip long-running test")
def test_scan_valid_domain(scanner):
    results = scanner.execute([VALID_DOMAIN])
    assert isinstance(results.get("output", {}), dict)

def test_preprocess(scanner):
    with pytest.raises(ValueError, match="Invalid domain"):
        scanner.preprocess([INVALID_DOMAIN])

def test_postprocess(scanner):
    raw_results = [{'domain': 'example.com', 'whois_raw': '', 'subdomains': ['dev.example.com', 'm.example.com']}]
    enriched = scanner.postprocess(raw_results)
    assert isinstance(enriched["output"], dict)
    assert enriched["output"]["domains"][0]["domain"] == "example.com"
    assert len(enriched["output"]["domains"]) == 1
    assert isinstance(enriched["output"]["domains"][0]["whois_raw"], str)
    assert isinstance(enriched["output"]["domains"][0]["subdomains"], list)

