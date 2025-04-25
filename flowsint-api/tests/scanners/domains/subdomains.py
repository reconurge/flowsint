import pytest
from app.scanners.domains.subdomains import SubdomainScanner
from app.types.domain import Domain

scanner = SubdomainScanner("123")

def test_preprocess_filters_invalid_domains():
    domains = [
        Domain(domain="example.com"),
        Domain(domain="invalid_domain")  # devrait être filtré
    ]
    result = scanner.preprocess(domains)

    result_domains = [d.domain for d in result]
    assert "example.com" in result_domains
    assert "invalid_domain" not in result_domains
    assert len(result_domains) == 1


def test_scan_extracts_subdomains(monkeypatch):
    mock_response = [
        {"name_value": "mail.example.com\nwww.example.com"},
        {"name_value": "api.example.com"},
        {"name_value": "invalid_domain"},  # devrait être ignoré
    ]

    class MockRequestsResponse:
        def __init__(self, json_data):
            self._json_data = json_data
            self.status_code = 200

        def json(self):
            return self._json_data

        @property
        def ok(self):
            return True

    def mock_get(url, timeout):
        assert "example.com" in url
        return MockRequestsResponse(mock_response)

    # Patch la requête réseau dans le module scanner
    monkeypatch.setattr("requests.get", mock_get)

    input_data = [Domain(domain="example.com")]
    result = scanner.scan(input_data)

    found = sorted([d.domain for d in result])
    expected = sorted([
        "mail.example.com",
        "www.example.com",
        "api.example.com"
    ])
    assert found == expected


def test_scan_handles_network_errors(monkeypatch):
    def raise_timeout(url, timeout):
        raise Exception("Network error")

    monkeypatch.setattr("requests.get", raise_timeout)

    input_data = [Domain(domain="example.com")]
    result = scanner.scan(input_data)

    assert result == []


def test_schemas():
    input_schema = scanner.input_schema()
    output_schema = scanner.output_schema()
    assert input_schema == [{'name': 'domain', 'type': 'string'}]
    assert output_schema == [{'name': 'domain', 'type': 'string'}]
