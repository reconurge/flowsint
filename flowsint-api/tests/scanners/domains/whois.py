from app.scanners.domains.whois import WhoisScanner
from app.types.domain import Domain
from app.types.whois import Whois
from app.types.email import Email

scanner = WhoisScanner("123")

def test_preprocess_valid_domains():
    domains = [
        Domain(domain="example.com"),
        Domain(domain="example2.com"),
    ]
    result = scanner.preprocess(domains)
    
    result_domains = [d.domain for d in result]
    expected_domains = [d.domain for d in domains]

    assert result_domains == expected_domains 
    
def test_preprocess_invalid_domains():
    domains = [
        Domain(domain="example.com"),
        Domain(domain="invalid_domain"),
        Domain(domain="example.org"),
    ]
    result = scanner.preprocess(domains)

    result_domains = [d.domain for d in result]
    assert "example.com" in result_domains
    assert "example.org" in result_domains
    assert "invalid_domain" not in result_domains

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

    input_data = [Domain(domain="example.com")]
    output = scanner.execute(input_data)
    assert isinstance(output, list)
    # assert isinstance(output[0], Whois)
    assert output[0].org == "MockOrg"
    # assert isinstance(output[0].email, Email)
    assert output[0].email.email == "admin@example.com"

def test_scan_handles_whois_error(monkeypatch):
    monkeypatch.setattr("app.scanners.domains.whois.whois", lambda domain: (_ for _ in ()).throw(Exception("fail")))

    input_data = [Domain(domain="example.com")]
    output = scanner.scan(input_data)
    
    # WHOIS failed, result should be empty or skipped
    assert output == []

def test_schemas():
    input_schema = scanner.input_schema()
    output_schema = scanner.output_schema()
    assert input_schema == [{'name': 'domain', 'type': 'string'}]
    assert output_schema == [{'name': 'registrar', 'type': 'string | null'}, {'name': 'org', 'type': 'string | null'}, {'name': 'city', 'type': 'string | null'}, {'name': 'country', 'type': 'string | null'}, {'name': 'email', 'type': 'Email | null'}, {'name': 'creation_date', 'type': 'string | null'}, {'name': 'expiration_date', 'type': 'string | null'}]
