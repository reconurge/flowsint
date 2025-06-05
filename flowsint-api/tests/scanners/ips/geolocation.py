import pytest
from app.scanners.ips.geolocation import GeolocationScanner
from app.types.ip import MinimalIp, Ip

scanner = GeolocationScanner("sketch_123", "scan_123")

def test_preprocess_valid_ips():
    ips = [
        MinimalIp(address="8.8.8.8"),
        MinimalIp(address="1.1.1.1"),
    ]
    result = scanner.preprocess(ips)
    result_ips = [d.address for d in result]
    expected_ips = [d.address for d in ips]
    assert result_ips == expected_ips

def test_preprocess_string_ips():
    ips = [
        "8.8.8.8",
        "1.1.1.1",
    ]
    result = scanner.preprocess(ips)
    result_ips = [d.address for d in result]
    expected_ips = [d for d in ips]
    assert [ip.address for ip in result] == expected_ips

def test_preprocess_invalid_ips():
    ips = [
        MinimalIp(address="8.8.8.8"),
        MinimalIp(address="invalid_ip"),
        MinimalIp(address="1.1.1.1"),
    ]
    result = scanner.preprocess(ips)
    result_ips = [d.address for d in result]
    assert "8.8.8.8" in result_ips
    assert "1.1.1.1" in result_ips
    assert "invalid_ip" not in result_ips

def test_preprocess_multiple_formats():
    ips = [
        {"address": "8.8.8.8"},
        {"invalid_key": "1.2.3.4"},
        MinimalIp(address="1.1.1.1"),
        "1.1.1.1",
    ]
    result = scanner.preprocess(ips)
    result_ips = [d.address for d in result]
    assert "8.8.8.8" in result_ips
    assert "1.1.1.1" in result_ips
    assert "1.2.3.4" not in result_ips

def test_scan_returns_ip(monkeypatch):
    # Mock of get_location_data
    def mock_get_location_data(address):
        return {
            "latitude": 37.386,
            "longitude": -122.0838,
            "country": "US",
            "city": "Mountain View",
            "isp": "Google LLC"
        }

    monkeypatch.setattr(scanner, "get_location_data", mock_get_location_data)

    input_data = [MinimalIp(address="8.8.8.8")]
    output = scanner.execute(input_data)
    assert isinstance(output, list)
    assert isinstance(output[0], Ip)
    assert output[0].address == "8.8.8.8"
    assert output[0].city == "Mountain View"
    assert output[0].country == "US"
    assert output[0].isp == "Google LLC"

def test_schemas():
    input_schema = scanner.input_schema()
    output_schema = scanner.output_schema()
    assert input_schema == [{'name': 'address', 'type': 'string'}]
    assert output_schema == [
        {'name': 'address', 'type': 'string'},
        {'name': 'latitude', 'type': 'number | null'},
        {'name': 'longitude', 'type': 'number | null'},
        {'name': 'country', 'type': 'string | null'},
        {'name': 'city', 'type': 'string | null'},
        {'name': 'isp', 'type': 'string | null'},
    ]
