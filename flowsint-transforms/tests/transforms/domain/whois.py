from flowsint_transforms.domains.whois import WhoisTransform
from flowsint_types.domain import Domain

transform = WhoisTransform("sketch_123", "scan_123")


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


def test_scan_returns_whois_objects(monkeypatch):
    # Patch `whois.whois` to avoid real network call
    mock_whois = lambda domain: {
        "registrar": "MockRegistrar",
        "org": "MockOrg",
        "city": "MockCity",
        "country": "MockCountry",
        "emails": ["admin@example.com"],
        "creation_date": "2020-01-01",
        "expiration_date": "2030-01-01",
    }

    monkeypatch.setattr("whois.whois", mock_whois)

    input_data = [Domain(domain="example.com")]
    output = transform.execute(input_data)
    assert isinstance(output, list)
    assert isinstance(output[0], Domain)
    assert output[0].whois.org == "MockOrg"
    assert output[0].whois.email.email == "admin@example.com"


def test_schemas():
    input_schema = transform.input_schema()
    output_schema = transform.output_schema()
    assert input_schema == {
        "type": "Domain",
        "properties": [
            {"name": "domain", "type": "string"},
            {"name": "subdomains", "type": "array | null"},
            {"name": "ips", "type": "array | null"},
            {"name": "whois", "type": "Whois | null"},
        ],
    }
    assert output_schema == {
        "type": "Domain",
        "properties": [
            {"name": "domain", "type": "string"},
            {"name": "subdomains", "type": "array | null"},
            {"name": "ips", "type": "array | null"},
            {"name": "whois", "type": "Whois | null"},
        ],
    }
