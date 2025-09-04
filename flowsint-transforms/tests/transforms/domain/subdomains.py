from flowsint_transforms.domains.subdomains import SubdomainTransform
from flowsint_types.domain import Domain, Domain

transform = SubdomainTransform("sketch_123", "scan_123")


def test_preprocess_valid_domains():
    domains = [
        Domain(domain="example.com"),
        Domain(domain="example2.com"),
    ]
    result = transform.preprocess(domains)

    result_domains = [d.domain for d in result]
    expected_domains = [d.domain for d in domains]

    assert result_domains == expected_domains


def test_unprocessed_valid_domains():
    domains = [
        "example.com",
        "example2.com",
    ]
    result = transform.preprocess(domains)
    result_domains = [d for d in result]
    expected_domains = [Domain(domain=d) for d in domains]
    assert result_domains == expected_domains


def test_preprocess_invalid_domains():
    domains = [
        Domain(domain="example.com"),
        Domain(domain="invalid_domain"),
        Domain(domain="example.org"),
    ]
    result = transform.preprocess(domains)

    result_domains = [d.domain for d in result]
    assert "example.com" in result_domains
    assert "example.org" in result_domains
    assert "invalid_domain" not in result_domains


def test_preprocess_multiple_formats():
    domains = [
        {"domain": "example.com"},
        {"invalid_key": "example.io"},
        Domain(domain="example.org"),
        "example.org",
    ]
    result = transform.preprocess(domains)

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

    # Patch la requête réseau dans le module transform
    monkeypatch.setattr("requests.get", mock_get)

    input_data = [Domain(domain="example.com")]
    domains = transform.execute(input_data)
    assert isinstance(domains, list)
    for sub in domains:
        print(sub)
        assert isinstance(sub, Domain)
    expected = sorted(["mail.example.com", "www.example.com", "api.example.com"])
    print(domains)
    # assert domains[0].subdomains == expected
