from flowsint_types.domain import Domain
import pytest


def test_valid_domain_from_object():
    domain = Domain(**{"domain": "mydomain.com"})
    assert domain.domain == "mydomain.com"
    assert domain.label == "mydomain.com"
    assert domain.root == True


def test_valid_subbomain_from_object():
    domain = Domain(**{"domain": "blog.mydomain.com"})
    assert domain.domain == "blog.mydomain.com"
    assert domain.label == "blog.mydomain.com"
    assert domain.root == False


def test_valid_domain_from_instance():
    domain = Domain(domain="mydomain.com")
    assert domain.domain == "mydomain.com"
    assert domain.label == "mydomain.com"
    assert domain.root == True


def test_valid_subdomain_from_instance():
    domain = Domain(domain="blog.mydomain.com")
    assert domain.domain == "blog.mydomain.com"
    assert domain.label == "blog.mydomain.com"
    assert domain.root == False


def test_invalid_domain_from_object():
    with pytest.raises(Exception) as e_info:
        Domain(**{"domain": "my_domain.com"})
    assert "Invalid domain" in str(e_info.value)


def test_domain_type_from_none():
    with pytest.raises(Exception) as e_info:
        Domain()
    assert "1 validation error for Domain" in str(e_info.value)
