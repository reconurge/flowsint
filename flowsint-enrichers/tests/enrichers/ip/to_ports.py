import pytest
from flowsint_enrichers.ip.to_ports import IpToPortsEnricher
from flowsint_types.ip import Ip


@pytest.fixture
def enricher():
    """Create an enricher instance for testing"""
    return IpToPortsEnricher(
        params={
            "mode": "passive",
            "top_ports": "100",
            "service_detection": "false",
        }
    )


def test_name():
    assert IpToPortsEnricher.name() == "ip_to_ports"


def test_category():
    assert IpToPortsEnricher.category() == "Ip"


def test_key():
    assert IpToPortsEnricher.key() == "address"


def test_required_params():
    assert IpToPortsEnricher.required_params() == False


def test_params_schema():
    schema = IpToPortsEnricher.get_params_schema()
    assert isinstance(schema, list)
    assert len(schema) > 0
    # Check that mode param exists
    mode_param = next((p for p in schema if p["name"] == "mode"), None)
    assert mode_param is not None
    assert mode_param["type"] == "select"
    assert mode_param["default"] == "passive"


def test_preprocess_string(enricher):
    """Test preprocessing with string input"""
    input_data = ["192.168.1.1", "10.0.0.1"]
    result = enricher.preprocess(input_data)
    assert len(result) == 2
    assert all(isinstance(ip, Ip) for ip in result)
    assert result[0].address == "192.168.1.1"
    assert result[1].address == "10.0.0.1"


def test_preprocess_dict(enricher):
    """Test preprocessing with dict input"""
    input_data = [{"address": "192.168.1.1"}, {"address": "10.0.0.1"}]
    result = enricher.preprocess(input_data)
    assert len(result) == 2
    assert all(isinstance(ip, Ip) for ip in result)


def test_preprocess_ip_objects(enricher):
    """Test preprocessing with Ip objects"""
    input_data = [Ip(address="192.168.1.1"), Ip(address="10.0.0.1")]
    result = enricher.preprocess(input_data)
    assert len(result) == 2
    assert all(isinstance(ip, Ip) for ip in result)


def test_preprocess_invalid_ip(enricher):
    """Test preprocessing filters out invalid IPs"""
    input_data = ["192.168.1.1", "not-an-ip", "10.0.0.1"]
    result = enricher.preprocess(input_data)
    assert len(result) == 2
    assert result[0].address == "192.168.1.1"
    assert result[1].address == "10.0.0.1"


@pytest.mark.asyncio
async def test_scan():
    """Test the scan method (requires API key for passive mode)"""
    # This test would require actual API credentials and network access
    # For now, just verify the method exists and has correct signature
    enricher = IpToPortsEnricher(
        params={"mode": "passive", "top_ports": "100"}
    )
    assert hasattr(enricher, "scan")
    assert callable(enricher.scan)
