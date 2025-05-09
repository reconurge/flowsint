from app.scanners.domains.whois import WhoisScanner
from app.types.domain import MinimalDomain
from app.types.whois import Whois

scanner = WhoisScanner("sketch_123", "scan_123")

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

def test_scan_returns_whois_objects(monkeypatch):
    # Patch `whois.whois` to avoid real network call
    mock_whois = lambda domain: {
        "registrar": "MockRegistrar",
        "org": "MockOrg",
        "city": "MockCity",
        "country": "MockCountry",
        "emails": ["admin@example.com"],
        "creation_date": "2020-01-01",
        "expiration_date": "2030-01-01"
    }

    monkeypatch.setattr("whois.whois", mock_whois)

    input_data = [MinimalDomain(domain="example.com")]
    output = scanner.execute(input_data)
    assert isinstance(output, list)
    assert isinstance(output[0], Whois)
    assert output[0].org == "MockOrg"
    assert output[0].email.email == "admin@example.com"

def test_schemas():
    input_schema = scanner.input_schema()
    output_schema = scanner.output_schema()
    assert input_schema == [{'name': 'domain', 'type': 'string'}]
    assert output_schema == [{'name': 'domain', 'type': 'any'}, {'name': 'registrar', 'type': 'string | null'}, {'name': 'org', 'type': 'string | null'}, {'name': 'city', 'type': 'string | null'}, {'name': 'country', 'type': 'string | null'}, {'name': 'email', 'type': 'Email | null'}, {'name': 'creation_date', 'type': 'string | null'}, {'name': 'expiration_date', 'type': 'string | null'}]
