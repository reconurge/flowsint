import json
from unittest.mock import Mock
from flowsint_transforms.ips.ip_to_asn import IpToAsnTransform
from flowsint_types.ip import Ip
from flowsint_types.asn import ASN
from flowsint_types.cidr import CIDR
from tests.logger import TestLogger

logger = TestLogger()
# The transform will get a mock logger from conftest.py automatically
transform = IpToAsnTransform("sketch_123", "scan_123", logger)


def test_preprocess_valid_ips():
    ips = [
        Ip(address="8.8.8.8"),
        Ip(address="1.1.1.1"),
    ]
    result = transform.preprocess(ips)

    result_addresses = [ip.address for ip in result]
    expected_addresses = [ip.address for ip in ips]

    assert result_addresses == expected_addresses


def test_unprocessed_valid_ips():
    ips = [
        "8.8.8.8",
        "1.1.1.1",
    ]
    result = transform.preprocess(ips)
    result_ips = [ip for ip in result]
    expected_ips = [Ip(address=ip) for ip in ips]
    assert result_ips == expected_ips


def test_preprocess_invalid_ips():
    ips = [
        Ip(address="8.8.8.8"),
        Ip(address="invalid_ip"),
        Ip(address="192.168.1.1"),
    ]
    result = transform.preprocess(ips)

    result_addresses = [ip.address for ip in result]
    assert "8.8.8.8" in result_addresses
    assert "192.168.1.1" in result_addresses
    assert "invalid_ip" not in result_addresses


def test_preprocess_multiple_formats():
    ips = [
        {"address": "8.8.8.8"},
        {"invalid_key": "1.1.1.1"},
        Ip(address="192.168.1.1"),
        "10.0.0.1",
    ]
    result = transform.preprocess(ips)

    result_addresses = [ip.address for ip in result]
    assert "8.8.8.8" in result_addresses
    assert "192.168.1.1" in result_addresses
    assert "10.0.0.1" in result_addresses
    assert (
        "1.1.1.1" not in result_addresses
    )  # Should be filtered out due to invalid key


def test_scan_extracts_asn_info(monkeypatch):
    mock_asnmap_output = {
        "input": "8.8.8.8",
        "as_number": "AS15169",
        "as_name": "GOOGLE",
        "as_country": "US",
        "as_range": ["8.8.8.0/24", "8.8.4.0/24"],
    }

    class MockSubprocessResult:
        def __init__(self, stdout):
            self.stdout = stdout
            self.returncode = 0

    def mock_subprocess_run(cmd, input, capture_output, text, timeout):
        assert "asnmap" in cmd
        assert input == "8.8.8.8"
        return MockSubprocessResult(json.dumps(mock_asnmap_output))

    # Patch the subprocess call in the transform
    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    input_data = [Ip(address="8.8.8.8")]
    asns = transform.scan(input_data)

    assert isinstance(asns, list)
    assert len(asns) == 1

    asn = asns[0]
    assert isinstance(asn, ASN)
    assert asn.number == 15169  # AS15169 -> 15169
    assert asn.name == "GOOGLE"
    assert asn.country == "US"
    assert len(asn.cidrs) == 2
    assert str(asn.cidrs[0].network) == "8.8.8.0/24"
    assert str(asn.cidrs[1].network) == "8.8.4.0/24"


def test_scan_handles_no_asn_found(monkeypatch):
    class MockSubprocessResult:
        def __init__(self, stdout):
            self.stdout = stdout
            self.returncode = 0

    def mock_subprocess_run(cmd, input, capture_output, text, timeout):
        # Return empty output to simulate no ASN found
        return MockSubprocessResult("")

    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    input_data = [Ip(address="192.168.1.1")]
    asns = transform.scan(input_data)

    assert isinstance(asns, list)
    assert len(asns) == 1

    asn = asns[0]
    assert isinstance(asn, ASN)
    assert asn.number == 0
    assert asn.name == "Unknown"
    assert asn.country == "Unknown"
    assert len(asn.cidrs) == 0


def test_scan_handles_subprocess_exception(monkeypatch):
    def mock_subprocess_run(cmd, input, capture_output, text, timeout):
        raise Exception("Subprocess failed")

    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    input_data = [Ip(address="8.8.8.8")]
    asns = transform.scan(input_data)

    assert isinstance(asns, list)
    assert len(asns) == 1

    asn = asns[0]
    assert isinstance(asn, ASN)
    assert asn.number == 0
    assert asn.name == "Unknown"
    assert asn.country == "Unknown"


def test_scan_multiple_ips(monkeypatch):
    mock_responses = {
        "8.8.8.8": {
            "input": "8.8.8.8",
            "as_number": "AS15169",
            "as_name": "GOOGLE",
            "as_country": "US",
            "as_range": ["8.8.8.0/24"],
        },
        "1.1.1.1": {
            "input": "1.1.1.1",
            "as_number": "AS13335",
            "as_name": "CLOUDFLARE",
            "as_country": "US",
            "as_range": ["1.1.1.0/24"],
        },
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

    input_data = [Ip(address="8.8.8.8"), Ip(address="1.1.1.1")]
    asns = transform.scan(input_data)

    assert len(asns) == 2

    # Check first ASN
    assert asns[0].number == 15169
    assert asns[0].name == "GOOGLE"

    # Check second ASN
    assert asns[1].number == 13335
    assert asns[1].name == "CLOUDFLARE"


def test_schemas():
    input_schema = transform.input_schema()
    output_schema = transform.output_schema()

    # Input schema should have address field
    assert "properties" in input_schema
    address_prop = next(
        (prop for prop in input_schema["properties"] if prop["name"] == "address"), None
    )
    assert address_prop is not None
    assert address_prop["type"] == "string"

    # Output schema should have ASN fields
    assert "properties" in output_schema
    prop_names = [prop["name"] for prop in output_schema["properties"]]
    assert "number" in prop_names
    assert "name" in prop_names
    assert "country" in prop_names
    assert "cidrs" in prop_names


def test_postprocess_creates_neo4j_relationships(monkeypatch):
    # Mock Neo4j connection
    mock_neo4j = Mock()
    transform.neo4j_conn = mock_neo4j

    input_data = [Ip(address="8.8.8.8")]
    asn_results = [
        ASN(
            number=15169,
            name="GOOGLE",
            country="US",
            cidrs=[CIDR(network="8.8.8.0/24")],
        )
    ]

    result = transform.postprocess(asn_results, input_data)

    # Verify Neo4j query was called
    mock_neo4j.query.assert_called_once()

    # Check the query parameters
    call_args = mock_neo4j.query.call_args
    params = call_args[0][1]
    assert params["ip_address"] == "8.8.8.8"
    assert params["asn_number"] == 15169
    assert params["asn_name"] == "GOOGLE"
    assert params["asn_country"] == "US"
    assert params["sketch_id"] == "sketch_123"

    # Should return the same results
    assert result == asn_results


def test_postprocess_skips_unknown_asns(monkeypatch):
    # Mock Neo4j connection
    mock_neo4j = Mock()
    transform.neo4j_conn = mock_neo4j

    input_data = [Ip(address="192.168.1.1")]
    asn_results = [
        ASN(number=0, name="Unknown", country="Unknown", cidrs=[])  # Unknown ASN
    ]

    result = transform.postprocess(asn_results, input_data)

    # Verify Neo4j query was NOT called for unknown ASN
    mock_neo4j.query.assert_not_called()

    # Should return the same results
    assert result == asn_results
