from flowsint_types import Domain, Individual, Ip, get_type
from flowsint_types.registry import TYPE_REGISTRY


def test_get_all():
    types = TYPE_REGISTRY.all_types()
    assert isinstance(types, dict)
    # test basic types
    assert "Domain" in types
    assert "Individual" in types


def test_get_by_capital_key():
    type = TYPE_REGISTRY.get("Domain")
    assert type is Domain


def test_get_by_lower_key():
    type = TYPE_REGISTRY.get_lowercase("domain")
    assert type is Domain


def test_get_by_lower_key():
    type = TYPE_REGISTRY.get_lowercase("domain")
    assert type is Domain


def get_type_function():
    # Probably the main util function used here, as we can pass it either capital or lowercase types
    type_lower = get_type("domain")
    type_capital = get_type("Domain")
    assert type_lower is type_capital is Domain


def get_correct_parsing():
    # Probably the main util function used here, as we can pass it either capital or lowercase types
    raw_dict = {"address": "12.23.45.67", type: "ip"}
    MyType = get_type(raw_dict.get("type"))
    new_ip_obj = MyType(**raw_dict)
    assert isinstance(new_ip_obj, Ip)
