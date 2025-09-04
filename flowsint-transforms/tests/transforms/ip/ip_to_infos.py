from flowsint_transforms.ips.geolocation import IpToInfosTransform
from flowsint_types.ip import Ip, Ip

transform = IpToInfosTransform("sketch_123", "scan_123")


def test_preprocess_valid_ips():
    ips = [
        Ip(address="8.8.8.8"),
        Ip(address="1.1.1.1"),
    ]
    result = transform.preprocess(ips)
    result_ips = [d.address for d in result]
    expected_ips = [d.address for d in ips]
    assert result_ips == expected_ips


def test_preprocess_string_ips():
    ips = [
        "8.8.8.8",
        "1.1.1.1",
    ]
    result = transform.preprocess(ips)
    result_ips = [d.address for d in result]
    expected_ips = [d for d in ips]
    assert [ip.address for ip in result] == expected_ips


def test_preprocess_invalid_ips():
    ips = [
        Ip(address="8.8.8.8"),
        Ip(address="invalid_ip"),
        Ip(address="1.1.1.1"),
    ]
    result = transform.preprocess(ips)
    result_ips = [d.address for d in result]
    assert "8.8.8.8" in result_ips
    assert "1.1.1.1" in result_ips
    assert "invalid_ip" not in result_ips


def test_preprocess_multiple_formats():
    ips = [
        {"address": "8.8.8.8"},
        {"invalid_key": "1.2.3.4"},
        Ip(address="1.1.1.1"),
        "1.1.1.1",
    ]
    result = transform.preprocess(ips)
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
            "isp": "Google LLC",
        }

    monkeypatch.setattr(transform, "get_location_data", mock_get_location_data)

    input_data = [Ip(address="8.8.8.8")]
    output = transform.execute(input_data)
    assert isinstance(output, list)
    assert isinstance(output[0], Ip)
    assert output[0].address == "8.8.8.8"
    assert output[0].city == "Mountain View"
    assert output[0].country == "US"
    assert output[0].isp == "Google LLC"


def test_schemas():
    input_schema = transform.input_schema()
    output_schema = transform.output_schema()
    assert input_schema == {
        "type": "Ip",
        "properties": [
            {"name": "address", "type": "string"},
            {"name": "latitude", "type": "number | null"},
            {"name": "longitude", "type": "number | null"},
            {"name": "country", "type": "string | null"},
            {"name": "city", "type": "string | null"},
            {"name": "isp", "type": "string | null"},
        ],
    }
    assert output_schema == {
        "type": "Ip",
        "properties": [
            {"name": "address", "type": "string"},
            {"name": "latitude", "type": "number | null"},
            {"name": "longitude", "type": "number | null"},
            {"name": "country", "type": "string | null"},
            {"name": "city", "type": "string | null"},
            {"name": "isp", "type": "string | null"},
        ],
    }
