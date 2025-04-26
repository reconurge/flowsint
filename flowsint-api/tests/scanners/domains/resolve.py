from app.scanners.domains.resolve import ResolveScanner
from app.types.domain import MinimalDomain

scanner = ResolveScanner("123")

def test_preprocess_valid_domains():
    domains = [
        MinimalDomain(domain="example.com"),
        MinimalDomain(domain="example2.com"),
    ]
    result = scanner.preprocess(domains)
    
    result_domains = [d.domain for d in result]
    expected_domains = [d.domain for d in domains]

    assert result_domains == expected_domains
    
def test_uneprocess_valid_domains():
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

def test_scan_returns_ip(monkeypatch):
    # on crée une fonction mock qui retourne une IP
    def mock_gethostbyname(domain):
        return "12.23.34.45"

    monkeypatch.setattr("socket.gethostbyname", mock_gethostbyname)

    input_data = [MinimalDomain(domain="example.com")]
    output = scanner.execute(input_data)
    print(output)
    assert isinstance(output, list)
    assert output[0].address == "12.23.34.45"

def test_schemas():
    input_schema = scanner.input_schema()
    output_schema = scanner.output_schema()
    assert input_schema == [{'name': 'domain', 'type': 'string'}]
    assert output_schema == [{'name': 'address', 'type': 'string'}]
