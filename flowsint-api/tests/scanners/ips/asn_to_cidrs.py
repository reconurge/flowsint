import json
from unittest.mock import Mock
from app.scanners.ips.asn_to_cidrs import AsnToCidrsScanner
from app.types.asn import ASN
from app.types.cidr import CIDR
from tests.logger import TestLogger

logger = TestLogger()
# The scanner will get a mock logger from conftest.py automatically
scanner = AsnToCidrsScanner("sketch_123", "scan_123", logger)

def test_preprocess_valid_asns():
    asns = [
        ASN(number=15169),
        ASN(number=13335),
    ]
    result = scanner.preprocess(asns)
    
    result_numbers = [asn.number for asn in result]
    expected_numbers = [asn.number for asn in asns]

    assert result_numbers == expected_numbers
    
def test_unprocessed_valid_asns():
    asns = [
        "15169",
        "13335",
    ]
    result = scanner.preprocess(asns)
    result_asns = [asn for asn in result]
    expected_asns = [ASN(number=int(asn)) for asn in asns]
    assert result_asns == expected_asns 
    
def test_preprocess_invalid_asns():
    asns = [
        ASN(number=15169),
        ASN(number=999999),  # Invalid ASN number
        ASN(number=13335),
    ]
    result = scanner.preprocess(asns)

    result_numbers = [asn.number for asn in result]
    assert 15169 in result_numbers
    assert 13335 in result_numbers
    assert 999999 not in result_numbers

def test_preprocess_multiple_formats():
    asns = [
        {"number": 15169},
        {"invalid_key": 13335},
        ASN(number=13335),
        "15169",
    ]
    result = scanner.preprocess(asns)

    result_numbers = [asn.number for asn in result]
    assert 15169 in result_numbers
    assert 13335 in result_numbers
    assert "invalid_key" not in result_numbers  # Should be filtered out due to invalid key

def test_scan_extracts_cidrs(monkeypatch):
    mock_asnmap_output = {
        "input": "15169",
        "as_number": "AS15169",
        "as_name": "GOOGLE",
        "as_country": "US",
        "as_range": ["8.8.8.0/24", "8.8.4.0/24"]
    }

    class MockSubprocessResult:
        def __init__(self, stdout):
            self.stdout = stdout
            self.returncode = 0

    def mock_subprocess_run(cmd, input, capture_output, text, timeout):
        assert "asnmap" in cmd
        assert input == "15169"
        return MockSubprocessResult(json.dumps(mock_asnmap_output))

    # Patch the subprocess call in the scanner
    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    input_data = [ASN(number=15169)]
    cidrs = scanner.scan(input_data)
    
    assert isinstance(cidrs, list)
    assert len(cidrs) == 2
    
    # Check CIDRs
    assert str(cidrs[0].network) == "8.8.8.0/24"
    assert str(cidrs[1].network) == "8.8.4.0/24"

def test_scan_handles_no_cidrs_found(monkeypatch):
    class MockSubprocessResult:
        def __init__(self, stdout):
            self.stdout = stdout
            self.returncode = 0

    def mock_subprocess_run(cmd, input, capture_output, text, timeout):
        # Return empty output to simulate no CIDRs found
        return MockSubprocessResult("")

    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    input_data = [ASN(number=999999)]
    cidrs = scanner.scan(input_data)
    
    assert isinstance(cidrs, list)
    assert len(cidrs) == 1
    
    # Should return default CIDR for unknown ASN
    assert str(cidrs[0].network) == "0.0.0.0/0"

def test_scan_handles_subprocess_exception(monkeypatch):
    def mock_subprocess_run(cmd, input, capture_output, text, timeout):
        raise Exception("Subprocess failed")

    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    input_data = [ASN(number=15169)]
    cidrs = scanner.scan(input_data)
    
    assert isinstance(cidrs, list)
    assert len(cidrs) == 1
    
    # Should return default CIDR on error
    assert str(cidrs[0].network) == "0.0.0.0/0"

def test_scan_multiple_asns(monkeypatch):
    mock_responses = {
        "15169": {
            "input": "15169",
            "as_number": "AS15169",
            "as_name": "GOOGLE",
            "as_country": "US",
            "as_range": ["8.8.8.0/24"]
        },
        "13335": {
            "input": "13335",
            "as_number": "AS13335",
            "as_name": "CLOUDFLARE",
            "as_country": "US",
            "as_range": ["1.1.1.0/24"]
        }
    }

    class MockSubprocessResult:
        def __init__(self, stdout):
            self.stdout = stdout
            self.returncode = 0

    def mock_subprocess_run(cmd, input, capture_output, text, timeout):
        if input in mock_responses:
            return MockSubprocessResult(json.dumps(mock_responses[input]))
        return MockSubprocessResult("")

    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    input_data = [ASN(number=15169), ASN(number=13335)]
    cidrs = scanner.scan(input_data)
    
    assert len(cidrs) == 2
    
    # Check CIDRs
    assert str(cidrs[0].network) == "8.8.8.0/24"
    assert str(cidrs[1].network) == "1.1.1.0/24"

def test_schemas():
    input_schema = scanner.input_schema()
    output_schema = scanner.output_schema()
    
    # Input schema should have number field
    assert "properties" in input_schema
    number_prop = next((prop for prop in input_schema["properties"] if prop["name"] == "number"), None)
    assert number_prop is not None
    assert number_prop["type"] == "integer"
    
    # Output schema should have network field
    assert "properties" in output_schema
    prop_names = [prop["name"] for prop in output_schema["properties"]]
    assert "network" in prop_names

def test_postprocess_creates_neo4j_relationships(monkeypatch):
    # Mock Neo4j connection
    mock_neo4j = Mock()
    scanner.neo4j_conn = mock_neo4j
    
    input_data = [ASN(number=15169, name="GOOGLE", country="US")]
    cidr_results = [CIDR(network="8.8.8.0/24")]
    
    result = scanner.postprocess(cidr_results, input_data)
    
    # Verify Neo4j query was called
    mock_neo4j.query.assert_called_once()
    
    # Check the query parameters
    call_args = mock_neo4j.query.call_args
    params = call_args[0][1]
    assert params["asn_number"] == 15169
    assert params["asn_name"] == "GOOGLE"
    assert params["asn_country"] == "US"
    assert params["cidr_network"] == "8.8.8.0/24"
    assert params["sketch_id"] == "sketch_123"
    
    # Should return the same results
    assert result == cidr_results

def test_postprocess_skips_default_cidr(monkeypatch):
    # Mock Neo4j connection
    mock_neo4j = Mock()
    scanner.neo4j_conn = mock_neo4j
    
    input_data = [ASN(number=999999)]
    cidr_results = [CIDR(network="0.0.0.0/0")]  # Default CIDR for unknown ASN
    
    result = scanner.postprocess(cidr_results, input_data)
    
    # Verify Neo4j query was NOT called for default CIDR
    mock_neo4j.query.assert_not_called()
    
    # Should return the same results
    assert result == cidr_results 