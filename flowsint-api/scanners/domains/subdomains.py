import pytest
from app.scanners.domains.subdomains import SubdomainScanner
from app.types.domain import MinimalDomain, Domain

scanner = SubdomainScanner("sketch_123", "scan_123")

def test_preprocess_valid_domains():
    domains = [
        MinimalDomain(domain="example.com"),
        MinimalDomain(domain="example2.com"),
    ]
    result = scanner.preprocess(domains)
    
    result_domains = [d.domain for d in result]
    expected_domains = [d.domain for d in domains]

    assert result_domains == expected_domains
    
def test_unprocessed_valid_domains():
    domains = [
        "example.com",
        "example2.com",
    ]
    result = scanner.preprocess(domains)
    result_domains = [d for d in result]
    expected_domains = [MinimalDomain(domain=d) for d in domains]
    assert result_domains == expected_domains 
    
def test_preprocess_invalid_domains():
    domains = [
        MinimalDomain(domain="example.com"),
        MinimalDomain(domain="invalid_domain"),
        MinimalDomain(domain="example.org"),
    ]
    result = scanner.preprocess(domains)

    result_domains = [d.domain for d in result]
    assert "example.com" in result_domains
    assert "example.org" in result_domains
    assert "invalid_domain" not in result_domains

def test_preprocess_multiple_formats():
    domains = [
        {"domain": "example.com"},
        {"invalid_key": "example.io"},
        MinimalDomain(domain="example.org"),
        "example.org",
    ]
    result = scanner.preprocess(domains)

    result_domains = [d.domain for d in result]
    assert "example.com" in result_domains
    assert "example.org" in result_domains
    assert "invalid_domain" not in result_domains
    assert "example.io" not in result_domains


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

    input_data = [MinimalDomain(domain="example.com")]
    domains = scanner.execute(input_data)
    assert isinstance(domains, list)
    for sub in domains:  
        print(sub)
        assert isinstance(sub, Domain)
    expected = sorted([
        "mail.example.com",
        "www.example.com",
        "api.example.com"
    ])
    assert domains[0].subdomains == expected


def test_schemas():
    input_schema = scanner.input_schema()
    output_schema = scanner.output_schema()
    assert input_schema == [{'name': 'domain', 'type': 'string'}]
    assert output_schema == [{'name': 'domain', 'type': 'string'}, {'name': 'subdomains', 'type': 'array | null'}, {'name': 'ips', 'type': 'array | null'}]
