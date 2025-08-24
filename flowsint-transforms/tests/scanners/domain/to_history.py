import pytest
import json
import os
from unittest.mock import Mock
from flowsint_transforms.domain.to_history import DomainToHistoryScanner
from flowsint_types.domain import Domain


class MockNeo4jConn:
    def __init__(self):
        self.nodes_created = []
        self.relationships_created = []

    def create_node(self, label, key, value, **kwargs):
        node_info = {"label": label, "key": key, "value": value, **kwargs}
        self.nodes_created.append(node_info)

    def create_relationship(
        self,
        from_label,
        from_key,
        from_value,
        to_label,
        to_key,
        to_value,
        relationship_type,
    ):
        rel_info = {
            "from": f"{from_label}:{from_value}",
            "to": f"{to_label}:{to_value}",
            "type": relationship_type,
        }
        self.relationships_created.append(rel_info)

    def query(self, query, params):
        """Mock query method to avoid errors."""
        pass


class MockScanner(DomainToHistoryScanner):
    def __init__(self):
        self.sketch_id = "test_sketch_123"
        self.neo4j_conn = MockNeo4jConn()
        self._extracted_data = []
        self._extracted_individuals = []

    def log_graph_message(self, message):
        """Mock log_graph_message method."""
        pass


@pytest.fixture
def scanner():
    """Create a scanner instance for testing."""
    scanner = MockScanner()
    return scanner


@pytest.fixture
def test_data():
    """Load test data from data.json."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.join(current_dir, "..", "..", "test_data", "data.json")
    with open(data_file, "r") as f:
        return json.load(f)


def test_preprocess_valid_domains(scanner):
    """Test preprocessing with valid domains."""
    domains = [
        Domain(domain="example.com"),
        Domain(domain="example2.com"),
    ]
    result = scanner.preprocess(domains)

    result_domains = [d.domain for d in result]
    expected_domains = [d.domain for d in domains]

    assert result_domains == expected_domains


def test_preprocess_string_domains(scanner):
    """Test preprocessing with string domains."""
    domains = ["example.com", "example2.com"]
    result = scanner.preprocess(domains)

    assert len(result) == 2
    assert all(isinstance(d, Domain) for d in result)
    assert result[0].domain == "example.com"
    assert result[1].domain == "example2.com"


def test_preprocess_dict_domains(scanner):
    """Test preprocessing with dict domains."""
    domains = [{"domain": "example.com"}, {"domain": "example2.com"}]
    result = scanner.preprocess(domains)

    assert len(result) == 2
    assert all(isinstance(d, Domain) for d in result)
    assert result[0].domain == "example.com"
    assert result[1].domain == "example2.com"


def test_preprocess_invalid_domains(scanner):
    """Test preprocessing with invalid domains."""
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


def test_is_redacted(scanner):
    """Test the __is_redacted method."""
    # Should be redacted
    assert scanner._DomainToHistoryScanner__is_redacted("REDACTED FOR PRIVACY")
    assert scanner._DomainToHistoryScanner__is_redacted("redacted for privacy")
    assert scanner._DomainToHistoryScanner__is_redacted("Some text with PRIVACY in it")

    # Should NOT be redacted
    assert not scanner._DomainToHistoryScanner__is_redacted("JOHN DOE")
    assert not scanner._DomainToHistoryScanner__is_redacted("john@doe.com")
    assert not scanner._DomainToHistoryScanner__is_redacted("123 JOHN STREET")
    assert not scanner._DomainToHistoryScanner__is_redacted("DOE CITY")


def test_has_non_redacted_info(scanner):
    """Test the __has_non_redacted_info method."""
    # Contact with valid information
    valid_contact = {
        "full_name": "JOHN DOE",
        "email_address": "john@doe.com, martinemah@yahoo.com",
        "phone_number": "+123456789",
        "mailing_address": "123 JOHN STREET",
        "city_name": "DOE CITY",
        "zip_code": "12345",
        "country_name": "United States",
    }
    assert scanner._DomainToHistoryScanner__has_non_redacted_info(valid_contact)

    # Contact with all redacted information
    redacted_contact = {
        "full_name": "REDACTED FOR PRIVACY",
        "email_address": "redacted for privacy",
        "phone_number": "REDACTED FOR PRIVACY",
        "mailing_address": "REDACTED FOR PRIVACY",
        "city_name": "REDACTED FOR PRIVACY",
        "zip_code": "REDACTED FOR PRIVACY",
        "country_name": "REDACTED FOR PRIVACY",
    }
    assert not scanner._DomainToHistoryScanner__has_non_redacted_info(redacted_contact)

    # Empty contact
    assert not scanner._DomainToHistoryScanner__has_non_redacted_info({})


def test_extract_individual_from_contact(scanner):
    """Test the __extract_individual_from_contact method."""
    # Valid contact
    valid_contact = {
        "full_name": "JOHN DOE",
        "email_address": "john@doe.com, martinemah@yahoo.com",
        "phone_number": "+123456789",
        "mailing_address": "123 JOHN STREET",
        "city_name": "DOE CITY",
        "zip_code": "12345",
        "country_name": "United States",
    }

    individual = scanner._DomainToHistoryScanner__extract_individual_from_contact(
        valid_contact, "REGISTRANT"
    )

    assert individual is not None
    assert individual.first_name == "MARC"
    assert individual.last_name == "DESCOLLONGES"
    assert individual.full_name == "JOHN DOE"
    assert len(individual.email_addresses) == 2
    assert "john@doe.com" in individual.email_addresses
    assert "martinemah@yahoo.com" in individual.email_addresses
    assert individual.phone_numbers == ["+123456789"]


def test_extract_individual_redacted_name(scanner):
    """Test that individuals with redacted names are skipped."""
    redacted_contact = {
        "full_name": "REDACTED FOR PRIVACY",
        "email_address": "test@example.com",
        "phone_number": "+1234567890",
    }

    individual = scanner._DomainToHistoryScanner__extract_individual_from_contact(
        redacted_contact, "REGISTRANT"
    )
    assert individual is None


def test_is_valid_email(scanner):
    """Test the __is_valid_email method."""
    # Valid emails
    assert scanner._DomainToHistoryScanner__is_valid_email("test@example.com")
    assert scanner._DomainToHistoryScanner__is_valid_email("user.name@domain.org")
    assert scanner._DomainToHistoryScanner__is_valid_email("user+tag@example.co.uk")

    # Invalid emails
    assert not scanner._DomainToHistoryScanner__is_valid_email("invalid-email")
    assert not scanner._DomainToHistoryScanner__is_valid_email("@example.com")
    assert not scanner._DomainToHistoryScanner__is_valid_email("test@")
    assert not scanner._DomainToHistoryScanner__is_valid_email("")


def test_extract_physical_address(scanner):
    """Test the __extract_physical_address method."""
    # Valid address
    valid_contact = {
        "mailing_address": "123 JOHN STREET",
        "city_name": "DOE CITY",
        "zip_code": "12345",
        "country_name": "United States",
    }

    address = scanner._DomainToHistoryScanner__extract_physical_address(valid_contact)

    assert address is not None
    assert address.address == "123 JOHN STREET"
    assert address.city == "DOE CITY"
    assert address.zip == "12345"
    assert address.country == "United States"

    # Address with redacted parts
    redacted_contact = {
        "mailing_address": "123 JOHN STREET",
        "city_name": "REDACTED FOR PRIVACY",
        "zip_code": "12345",
        "country_name": "United States",
    }

    address = scanner._DomainToHistoryScanner__extract_physical_address(
        redacted_contact
    )
    assert address is None


@pytest.mark.asyncio
async def test_scan_with_test_data(scanner, test_data, monkeypatch):
    """Test the scan method with test data."""

    # Mock the __get_infos_from_whoxy method to return test data
    def mock_get_infos(domain):
        if domain == "epios.com":
            return test_data
        return {}

    monkeypatch.setattr(
        scanner, "_DomainToHistoryScanner__get_infos_from_whoxy", mock_get_infos
    )

    # Test with epios.com domain
    input_domains = [Domain(domain="epios.com")]
    results = await scanner.scan(input_domains)

    # Should find the domain (one for each WHOIS record)
    assert len(results) == 16  # 16 WHOIS records in the test data
    assert all(r.domain == "epios.com" for r in results)

    # Should have extracted data
    assert len(scanner._extracted_data) == 16

    # Should have extracted individuals
    assert (
        len(scanner._extracted_individuals) > 0
    ), "Should have extracted some individuals"

    # Check that JOHN DOE is in the extracted individuals
    marc_found = False
    marc_individuals = []

    for individual_info in scanner._extracted_individuals:
        individual = individual_info["individual"]
        if "JOHN DOE" in individual.full_name:
            marc_found = True
            marc_individuals.append(individual_info)
            print(
                f"Found MARC: {individual.full_name} ({individual_info['contact_type']})"
            )
            print(f"  Emails: {individual.email_addresses}")
            print(f"  Phones: {individual.phone_numbers}")

    assert marc_found, "JOHN DOE should be found in the extracted individuals"
    assert (
        len(marc_individuals) > 0
    ), f"Expected to find JOHN DOE, but found {len(marc_individuals)} instances"

    # Print summary of all extracted individuals
    print(f"\n=== Summary of extracted individuals ===")
    for individual_info in scanner._extracted_individuals:
        individual = individual_info["individual"]
        print(
            f"- {individual.full_name} ({individual_info['contact_type']}) for {individual_info['domain_name']}"
        )
        if individual.email_addresses:
            print(f"  Emails: {individual.email_addresses}")
        if individual.phone_numbers:
            print(f"  Phones: {individual.phone_numbers}")


def test_postprocess_creates_nodes_and_relationships(scanner, test_data, monkeypatch):
    """Test that postprocess creates the expected nodes and relationships."""

    # Mock the __get_infos_from_whoxy method
    def mock_get_infos(domain):
        if domain == "epios.com":
            return test_data
        return {}

    monkeypatch.setattr(
        scanner, "_DomainToHistoryScanner__get_infos_from_whoxy", mock_get_infos
    )

    # First run scan to populate _extracted_data and _extracted_individuals
    import asyncio

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        input_domains = [Domain(domain="epios.com")]
        results = loop.run_until_complete(scanner.scan(input_domains))

        # Debug: Check what individuals were extracted
        print(
            f"\n=== DEBUG: _extracted_individuals has {len(scanner._extracted_individuals)} individuals ==="
        )
        for i, individual_info in enumerate(scanner._extracted_individuals):
            individual = individual_info["individual"]
            print(
                f"Individual {i+1}: {individual.full_name} ({individual_info['contact_type']}) for {individual_info['domain_name']}"
            )
            if individual.email_addresses:
                print(f"  Emails: {individual.email_addresses}")
            if individual.phone_numbers:
                print(f"  Phones: {individual.phone_numbers}")

        # Now run postprocess
        print(f"\n=== Running postprocess ===")
        scanner.postprocess(results, input_domains)

        # Debug: Check what happened during postprocess
        print(f"=== Postprocess completed ===")
        print(f"Nodes created: {len(scanner.neo4j_conn.nodes_created)}")
        print(f"Relationships created: {len(scanner.neo4j_conn.relationships_created)}")

        # Should have created some nodes
        assert len(scanner.neo4j_conn.nodes_created) > 0

        # Should have created some relationships
        assert len(scanner.neo4j_conn.relationships_created) > 0

        # Check for domain node
        domain_nodes = [
            n for n in scanner.neo4j_conn.nodes_created if n["label"] == "domain"
        ]
        assert len(domain_nodes) > 0

        # Check for individual nodes (should include JOHN DOE)
        individual_nodes = [
            n for n in scanner.neo4j_conn.nodes_created if n["label"] == "individual"
        ]
        assert len(individual_nodes) > 0

        # Check that JOHN DOE is in the individual nodes
        marc_nodes = [n for n in individual_nodes if "JOHN DOE" in n["value"]]
        assert (
            len(marc_nodes) > 0
        ), "JOHN DOE should be in the individual nodes"

    finally:
        loop.close()


def test_schemas(scanner):
    """Test that the scanner has the expected schemas."""
    input_schema = scanner.input_schema()
    output_schema = scanner.output_schema()

    assert input_schema is not None
    assert output_schema is not None
