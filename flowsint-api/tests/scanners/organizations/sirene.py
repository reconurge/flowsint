import pytest
from app.scanners.organizations.sirene import SireneScanner
from app.types.organization import Organization, Organization

scanner = SireneScanner("sketch_123", "scan_123")

def test_preprocess_valid_names():
    data = [
        Organization(name="OpenAI"),
        {"name": "Inria"},
        "OVH"
    ]
    result = scanner.preprocess(data)
    result_names = [org.name for org in result]

    assert result_names == ["OpenAI", "Inria", "OVH"]

def test_preprocess_invalid_entries():
    data = [
        {"wrong_key": "value"},
        123,
        None,
        "",
        {"name": ""},
    ]
    result = scanner.preprocess(data)
    assert result == []

def test_scan_enriches_organization(monkeypatch):
    mock_api_response = {
        "etablissement": {
            "siren": "123456789",
            "denomination": "OpenAI",
            "dateCreationEtablissement": "2020-01-01",
            "activitePrincipale": "Recherche IA",
            "adresseEtablissement": {
                "libelleCommuneEtablissement": "Paris"
            }
        }
    }

    class MockResponse:
        def __init__(self, json_data):
            self._json_data = json_data
            self.status_code = 200

        def json(self):
            return self._json_data

        def raise_for_status(self):
            pass

    def mock_get(url, headers, timeout):
        assert "OpenAI" in url
        return MockResponse(mock_api_response)

    monkeypatch.setattr("requests.get", mock_get)

    input_data = [Organization(name="OpenAI")]
    result = scanner.scan(input_data)

    assert isinstance(result, list)
    assert len(result) == 1
    org = result[0]
    assert isinstance(org, Organization)
    assert org.name == "OpenAI"
    assert org.founding_date == "2020-01-01"
    assert org.country == "France"
    assert isinstance(org.identifiers, list)
    assert org.identifiers[0].type == "SIREN"
    assert org.identifiers[0].value == "123456789"

def test_schema():
    input_schema = scanner.input_schema()
    output_schema = scanner.output_schema()

    assert {'name': 'name', 'type': 'string'} in input_schema
    output_keys = [entry['name'] for entry in output_schema]
    for field in ['name', 'founding_date', 'country', 'description', 'identifiers']:
        assert field in output_keys
