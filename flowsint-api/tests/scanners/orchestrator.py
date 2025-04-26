from app.scanners.orchestrator import TransformOrchestrator
from app.types.domain import Domain, MinimalDomain
from app.types.whois import Whois

import pytest

def test_preprocess_valid_domains():
    scanner = TransformOrchestrator("123",scanner_names= ["domain_resolve_scanner", "domain_whois_scanner"])
    assert isinstance(scanner.scanners, list)
    assert len(scanner.scanners) == 2
    
def test_preprocess_valid_domains():
    with pytest.raises(ValueError, match="Scanner 'this_scan_is_wrong' not found in registry"):
         TransformOrchestrator("123",scanner_names= ["domain_resolve_scanner", "this_scan_is_wrong"])

def test_execute_domain_subdomains_scanner():
    domains = ["example.com"]
    scanner = TransformOrchestrator("123", scanner_names = ["domain_subdomains_scanner"])
    results = scanner.execute(values=domains)
    assert results["initial_values"] == domains
    assert results['scanners'] == ['domain_subdomains_scanner']
    assert isinstance(results['results']['domain_subdomains_scanner'], list)
    assert isinstance(results['results']['domain_subdomains_scanner'][0], Domain)


def test_execute_domain_whois_scanner():
    domains = ["example.com"]
    scanner = TransformOrchestrator("123", scanner_names = ["domain_whois_scanner"])
    results = scanner.execute(values=domains)
    assert results["initial_values"] == domains
    assert results['scanners'] == ['domain_whois_scanner']
    assert isinstance(results['results']['domain_whois_scanner'], list)
    assert isinstance(results['results']['domain_whois_scanner'][0], Whois)
    
def test_execute_ip_resolve():
    ips = ['91.199.212.73']
    scanner = TransformOrchestrator("123", scanner_names = ["ip_reverse_resolve_scanner"])
    results = scanner.execute(values=ips)
    assert results["initial_values"] == ips
    assert results['scanners'] == ['ip_reverse_resolve_scanner']
    assert isinstance(results['results']['ip_reverse_resolve_scanner'], list)
    if(len(results['results']['ip_reverse_resolve_scanner'])!= 0):
        assert isinstance(results['results']['ip_reverse_resolve_scanner'][0], MinimalDomain)
    
def test_execute_ip_resolve_and_whois():
    ips = ['91.199.212.73']
    scanner = TransformOrchestrator("123", scanner_names = ["ip_reverse_resolve_scanner", "domain_whois_scanner"])
    results = scanner.execute(values=ips)
    assert results["initial_values"] == ips
    assert results['scanners'] == ['ip_reverse_resolve_scanner', 'domain_whois_scanner']
    
def test_execute_ip_resolve_and_whois_multiple():
    ips = ['91.199.212.73', '76.76.21.21']
    scanner = TransformOrchestrator("123", scanner_names = ["ip_reverse_resolve_scanner", "domain_whois_scanner"])
    results = scanner.execute(values=ips)
    assert results["initial_values"] == ips
    assert results['scanners'] == ['ip_reverse_resolve_scanner', 'domain_whois_scanner']
    print(results)

def test_execute_ip_resolve_and_whois_multiple():
    ips = ['162.19.81.222']
    scanner = TransformOrchestrator("123", scanner_names = ["ip_reverse_resolve_scanner", "domain_whois_scanner", "domain_subdomains_scanner"])
    results = scanner.execute(values=ips)
    assert results["initial_values"] == ips
    assert results['scanners'] == ['ip_reverse_resolve_scanner', 'domain_whois_scanner', "domain_subdomains_scanner"]
    
def test_execute_domain_whois_and_subdomains():
    domains = ["alliage.io"]
    scanner = TransformOrchestrator("123", scanner_names = ["domain_whois_scanner", "domain_subdomains_scanner"])
    results = scanner.execute(values=domains)
    assert results["initial_values"] == domains
    assert results['scanners'] == ['domain_whois_scanner', "domain_subdomains_scanner"]

def test_execute_domain_subdomains():
    domains = ["alliage.io"]
    scanner = TransformOrchestrator("123", scanner_names = ["domain_subdomains_scanner"])
    results = scanner.execute(values=domains)
    assert results["initial_values"] == domains
    assert results['scanners'] == ["domain_subdomains_scanner"]
