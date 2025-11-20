from flowsint_types import Domain, Ip, Individual


def test_ip_label():
    ip = Ip(address="12.23.34.56")
    assert ip.label == "12.23.34.56"


def test_domain_label():
    domain = Domain(domain="blog.mydomain.com")
    assert domain.label == "blog.mydomain.com"


def test_individual_label():
    indivudual = Individual(first_name="John", last_name="Doe")
    assert indivudual.label == "John Doe"
