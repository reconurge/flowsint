import pytest
from flowsint_transforms.ip.to_ports import IpToPortsTransform
from flowsint_types.ip import Ip


@pytest.fixture
def transform():
    """Create a transform instance for testing"""
    return IpToPortsTransform(
        params={
            "mode": "passive",
            "top_ports": "100",
            "service_detection": "false",
        }
    )


def test_name():
    assert IpToPortsTransform.name() == "ip_to_ports"


def test_category():
    assert IpToPortsTransform.category() == "Ip"


def test_key():
    assert IpToPortsTransform.key() == "address"


def test_required_params():
    assert IpToPortsTransform.required_params() == False


def test_params_schema():
    schema = IpToPortsTransform.get_params_schema()
    assert isinstance(schema, list)
    assert len(schema) > 0
    # Check that mode param exists
    mode_param = next((p for p in schema if p["name"] == "mode"), None)
    assert mode_param is not None
    assert mode_param["type"] == "select"
    assert mode_param["default"] == "passive"


def test_preprocess_string(transform):
    """Test preprocessing with string input"""
    input_data = ["192.168.1.1", "10.0.0.1"]
    result = transform.preprocess(input_data)
    assert len(result) == 2
    assert all(isinstance(ip, Ip) for ip in result)
    assert result[0].address == "192.168.1.1"
    assert result[1].address == "10.0.0.1"


def test_preprocess_dict(transform):
    """Test preprocessing with dict input"""
    input_data = [{"address": "192.168.1.1"}, {"address": "10.0.0.1"}]
    result = transform.preprocess(input_data)
    assert len(result) == 2
    assert all(isinstance(ip, Ip) for ip in result)


def test_preprocess_ip_objects(transform):
    """Test preprocessing with Ip objects"""
    input_data = [Ip(address="192.168.1.1"), Ip(address="10.0.0.1")]
    result = transform.preprocess(input_data)
    assert len(result) == 2
    assert all(isinstance(ip, Ip) for ip in result)


def test_preprocess_invalid_ip(transform):
    """Test preprocessing filters out invalid IPs"""
    input_data = ["192.168.1.1", "not-an-ip", "10.0.0.1"]
    result = transform.preprocess(input_data)
    assert len(result) == 2
    assert result[0].address == "192.168.1.1"
    assert result[1].address == "10.0.0.1"


@pytest.mark.asyncio
async def test_scan():
    """Test the scan method (requires API key for passive mode)"""
    # This test would require actual API credentials and network access
    # For now, just verify the method exists and has correct signature
    transform = IpToPortsTransform(
        params={"mode": "passive", "top_ports": "100"}
    )
    assert hasattr(transform, "scan")
    assert callable(transform.scan)
