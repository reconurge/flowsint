import pytest
from flowsint_types.ip import Ip


def test_valid_ip():
    ip = Ip(address="12.23.34.56")
    assert ip.address == "12.23.34.56"
    assert ip.nodeLabel == "12.23.34.56"


def test_invalid_ip():
    with pytest.raises(Exception) as e_info:
        Ip(address="12.23.34.564")
    assert "Invalid IP address" in str(e_info.value)
