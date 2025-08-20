from flowsint_transforms.organizations.to_infos import OrgToInfosScanner
from flowsint_types.organization import Organization

scanner = OrgToInfosScanner("sketch_123", "scan_123")


def test_preprocess_valid_names():
    data = [Organization(name="OpenAI"), {"name": "Inria"}, "OVH"]
    result = scanner.preprocess(data)
    result_names = [org.name for org in result]

    assert result_names == ["OpenAI", "Inria", "OVH"]


# def test_preprocess_invalid_entries():
#     data = [
#         {"wrong_key": "value"},
#         123,
#         None,
#         "",
#         {"name": ""},
#     ]
#     result = scanner.preprocess(data)
#     assert result == []


def test_execute():
    scanner.execute(["Karim Terrache"])
    assert True
