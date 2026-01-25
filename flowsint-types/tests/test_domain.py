import pytest

from flowsint_types.domain import Domain


def test_valid_domain_from_object():
    domain = Domain(**{"domain": "mydomain.com"})
    assert domain.domain == "mydomain.com"
    assert domain.nodeLabel == "mydomain.com"
    assert domain.root


def test_valid_subbomain_from_object():
    domain = Domain(**{"domain": "blog.mydomain.com"})
    assert domain.domain == "blog.mydomain.com"
    assert domain.nodeLabel == "blog.mydomain.com"
    assert not domain.root


def test_valid_domain_from_instance():
    domain = Domain(domain="mydomain.com")
    assert domain.domain == "mydomain.com"
    assert domain.nodeLabel == "mydomain.com"
    assert domain.root


def test_valid_subdomain_from_instance():
    domain = Domain(domain="blog.mydomain.com")
    assert domain.domain == "blog.mydomain.com"
    assert domain.nodeLabel == "blog.mydomain.com"
    assert not domain.root


def test_invalid_domain_from_object():
    with pytest.raises(Exception) as e_info:
        Domain(**{"domain": "my_domain.com"})
    assert "Invalid domain" in str(e_info.value)


def test_domain_type_from_none():
    with pytest.raises(Exception) as e_info:
        Domain()
    assert "1 validation error for Domain" in str(e_info.value)
