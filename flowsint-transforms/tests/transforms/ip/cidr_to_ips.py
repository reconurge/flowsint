from flowsint_transforms.ips.cidr_to_ips import CidrToIpsTransform
from flowsint_types.cidr import CIDR
from flowsint_types.ip import Ip
from tests.logger import TestLogger

logger = TestLogger()
transform = CidrToIpsTransform("sketch_123", "scan_123", logger)


def test_preprocess_valid_cidrs():
    cidrs = [
        CIDR(network="8.8.8.0/24"),
        CIDR(network="1.1.1.0/24"),
    ]
    result = transform.preprocess(cidrs)

    result_networks = [cidr.network for cidr in result]
    expected_networks = [cidr.network for cidr in cidrs]

    assert result_networks == expected_networks


def test_preprocess_unprocessed_valid_cidrs():
    cidrs = [
        "8.8.8.0/24",
        "1.1.1.0/24",
    ]
    result = transform.preprocess(cidrs)
    result_cidrs = [c for c in result]
    expected_cidrs = [CIDR(network=c) for c in cidrs]
    assert result_cidrs == expected_cidrs


def test_preprocess_invalid_cidrs():
    cidrs = [
        CIDR(network="8.8.8.0/24"),
        "invalid-cidr",
        "not-a-cidr",
    ]
    result = transform.preprocess(cidrs)
    result_networks = [str(cidr.network) for cidr in result]
    assert "8.8.8.0/24" in result_networks
    assert "invalid-cidr" not in result_networks
    assert "not-a-cidr" not in result_networks


def test_preprocess_multiple_formats():
    cidrs = [
        {"network": "8.8.8.0/24"},
        {"invalid_key": "1.1.1.0/24"},
        CIDR(network="9.9.9.0/24"),
        "InvalidCIDR",
    ]
    result = transform.preprocess(cidrs)
    result_networks = [str(cidr.network) for cidr in result]
    assert "8.8.8.0/24" in result_networks
    assert "9.9.9.0/24" in result_networks
    assert "1.1.1.0/24" not in result_networks
    assert "InvalidCIDR" not in result_networks


def test_scan_extracts_ips(monkeypatch):
    mock_dnsx_output = """8.35.200.12
8.35.200.112
8.35.200.16
8.35.200.170"""

    class MockSubprocessResult:
        def __init__(self, stdout):
            self.stdout = stdout
            self.returncode = 0

    def mock_subprocess_run(cmd, shell, capture_output, text, timeout):
        assert "dnsx" in cmd
        assert "-ptr" in cmd
        return MockSubprocessResult(mock_dnsx_output)

    # Patch the subprocess call in the transform
    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    input_data = [CIDR(network="8.35.200.0/24")]
    ips = transform.scan(input_data)

    assert isinstance(ips, list)
    assert len(ips) == 4

    expected_ips = ["8.35.200.12", "8.35.200.112", "8.35.200.16", "8.35.200.170"]

    for ip in ips:
        assert isinstance(ip, Ip)
        assert ip.address in expected_ips


def test_scan_handles_empty_output(monkeypatch):
    class MockSubprocessResult:
        def __init__(self):
            self.stdout = ""
            self.returncode = 0

    def mock_subprocess_run(cmd, shell, capture_output, text, timeout):
        return MockSubprocessResult()

    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    input_data = [CIDR(network="8.8.8.0/24")]
    ips = transform.scan(input_data)

    assert isinstance(ips, list)
    assert len(ips) == 0


def test_scan_handles_subprocess_exception(monkeypatch):
    def mock_subprocess_run(cmd, shell, capture_output, text, timeout):
        raise Exception("Subprocess failed")

    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    input_data = [CIDR(network="8.8.8.0/24")]
    ips = transform.scan(input_data)

    assert isinstance(ips, list)
    assert len(ips) == 0
