from flowsint_enrichers.organizations.to_infos import OrgToInfosEnricher
from flowsint_types.organization import Organization

enricher = OrgToInfosEnricher("sketch_123", "scan_123")


def test_preprocess_valid_names():
    data = [Organization(name="OpenAI"), {"name": "Inria"}, "OVH"]
    result = enricher.preprocess(data)
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
#     result = enricher.preprocess(data)
#     assert result == []


def test_execute():
    enricher.execute(["Karim Terrache"])
    assert True
