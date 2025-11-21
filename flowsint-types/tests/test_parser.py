"""
Tests for Neo4j node to Pydantic model parsing.

These tests ensure that parse_node_to_pydantic correctly handles:
- Valid nodes with all fields
- Nodes with empty strings for optional fields
- Nodes with missing optional fields
- Nodes with Neo4j-specific fields that should be filtered
- Invalid nodes that should fail validation
"""

import pytest
from pydantic import BaseModel
from flowsint_types import (
    parse_node_to_pydantic,
    clean_neo4j_node_data,
    TYPE_TO_MODEL,
    get_model_for_type,
    Domain,
    Ip,
    Email,
    Phone,
    Organization,
    Username,
    Website,
    ASN,
    CIDR,
    SocialAccount,
    Individual,
    Phrase,
    Port,
)


class TestCleanNeo4jNodeData:
    """Test suite for clean_neo4j_node_data function."""

    def test_clean_removes_neo4j_fields(self):
        """Test that Neo4j-specific fields are removed."""
        node_data = {
            'type': 'domain',  # Neo4j type field, should be removed
            'domain': 'example.com',
            'label': 'example.com',
            'sketch_id': 'should-be-removed',
            'created_at': 'should-be-removed',
            'x': 100,
            'y': 200,
            'caption': 'should-be-removed',
            'color': 'should-be-removed',
        }

        result = clean_neo4j_node_data(node_data)

        assert 'type' not in result  # Neo4j 'type' field should be removed
        assert 'domain' in result
        assert 'label' in result
        assert 'sketch_id' not in result
        assert 'created_at' not in result
        assert 'x' not in result
        assert 'y' not in result
        assert 'caption' not in result
        assert 'color' not in result

    def test_clean_removes_empty_strings(self):
        """Test that empty strings are removed."""
        node_data = {
            'type': 'ip',
            'address': '192.168.1.1',
            'latitude': '',
            'longitude': '',
            'country': '',
        }

        result = clean_neo4j_node_data(node_data)

        assert result == {'address': '192.168.1.1'}

    def test_clean_removes_none_values(self):
        """Test that None values are removed."""
        node_data = {
            'type': 'domain',
            'domain': 'example.com',
            'some_field': None,
        }

        result = clean_neo4j_node_data(node_data)

        assert result == {'domain': 'example.com'}

    def test_clean_removes_empty_lists(self):
        """Test that empty lists are removed."""
        node_data = {
            'type': 'domain',
            'domain': 'example.com',
            'tags': [],
        }

        result = clean_neo4j_node_data(node_data)

        assert result == {'domain': 'example.com'}

    def test_clean_removes_empty_dicts(self):
        """Test that empty dicts are removed."""
        node_data = {
            'type': 'domain',
            'domain': 'example.com',
            'metadata': {},
        }

        result = clean_neo4j_node_data(node_data)

        assert result == {'domain': 'example.com'}

    def test_clean_preserves_valid_data(self):
        """Test that valid data is preserved (except Neo4j 'type' field)."""
        node_data = {
            'type': 'ip',
            'address': '8.8.8.8',
            'label': '8.8.8.8',
            'latitude': 37.386,
            'longitude': -122.0838,
            'country': 'US',
        }

        result = clean_neo4j_node_data(node_data)

        # 'type' is filtered, rest is preserved
        expected = {
            'address': '8.8.8.8',
            'label': '8.8.8.8',
            'latitude': 37.386,
            'longitude': -122.0838,
            'country': 'US',
        }
        assert result == expected

    def test_clean_preserves_zero_values(self):
        """Test that zero values are preserved (not treated as empty)."""
        node_data = {
            'type': 'ip',
            'address': '127.0.0.1',
            'latitude': 0,
            'longitude': 0,
        }

        result = clean_neo4j_node_data(node_data)

        assert result['latitude'] == 0
        assert result['longitude'] == 0

    def test_clean_empty_dict(self):
        """Test cleaning an empty dict."""
        result = clean_neo4j_node_data({})
        assert result == {}


class TestParseNodeToPydantic:
    """Test suite for parse_node_to_pydantic function."""

    def test_parse_domain_valid(self):
        """Test parsing a valid domain node from Neo4j."""
        node_data = {
            'type': 'domain',
            'domain': 'example.com',
            'label': 'example.com',
            'root': True,
            'sketch_id': 'abc-123',
            'created_at': '2024-01-01T00:00:00Z',
            'x': 100,
            'y': 200,
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Domain)
        assert result.domain == 'example.com'
        assert result.label == 'example.com'
        assert result.root == True

    def test_parse_ip_with_empty_optional_fields(self):
        """Test parsing IP node with empty strings for optional fields."""
        node_data = {
            'type': 'ip',
            'address': '192.168.1.1',
            'label': '192.168.1.1',
            'latitude': '',  # Empty string should be filtered
            'longitude': '',  # Empty string should be filtered
            'country': '',
            'city': '',
            'isp': '',
            'sketch_id': 'abc-123',
            'created_at': '2024-01-01T00:00:00Z',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Ip)
        assert result.address == '192.168.1.1'
        assert result.latitude is None
        assert result.longitude is None
        assert result.country is None
        assert result.city is None
        assert result.isp is None

    def test_parse_ip_with_valid_optional_fields(self):
        """Test parsing IP node with valid optional fields."""
        node_data = {
            'type': 'ip',
            'address': '8.8.8.8',
            'label': '8.8.8.8',
            'latitude': 37.386,
            'longitude': -122.0838,
            'country': 'US',
            'city': 'Mountain View',
            'isp': 'Google LLC',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Ip)
        assert result.address == '8.8.8.8'
        assert result.latitude == 37.386
        assert result.longitude == -122.0838
        assert result.country == 'US'
        assert result.city == 'Mountain View'
        assert result.isp == 'Google LLC'

    def test_parse_email_valid(self):
        """Test parsing a valid email node."""
        node_data = {
            'type': 'email',
            'email': 'test@example.com',
            'label': 'test@example.com',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Email)
        assert result.email == 'test@example.com'

    def test_parse_phone_valid(self):
        """Test parsing a valid phone node."""
        node_data = {
            'type': 'phone',
            'number': '+33612345678',
            'label': '+33612345678',
            'country': 'FR',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Phone)
        assert result.number == '+33612345678'
        assert result.country == 'FR'

    def test_parse_organization_valid(self):
        """Test parsing a valid organization node."""
        node_data = {
            'type': 'organization',
            'name': 'ACME Corp',
            'label': 'ACME Corp',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Organization)
        assert result.name == 'ACME Corp'

    def test_parse_node_filters_neo4j_fields(self):
        """Test that Neo4j-specific fields are filtered out."""
        node_data = {
            'type': 'domain',
            'domain': 'test.com',
            'label': 'test.com',
            'sketch_id': 'should-be-filtered',
            'created_at': 'should-be-filtered',
            'x': 100,
            'y': 200,
            'caption': 'should-be-filtered',
            'color': 'should-be-filtered',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Domain)
        # These fields should not cause errors even though they're not in the Pydantic model
        assert result.domain == 'test.com'

    def test_parse_node_missing_type(self):
        """Test that nodes without 'type' field return None."""
        node_data = {
            'domain': 'example.com',
            'label': 'example.com',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is None

    def test_parse_node_unknown_type(self):
        """Test that nodes with unknown type return None."""
        node_data = {
            'type': 'unknown_type_xyz',
            'some_field': 'some_value',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is None

    def test_parse_node_invalid_email(self):
        """Test that invalid data fails validation and returns None."""
        node_data = {
            'type': 'email',
            'email': 'not-an-email',  # Invalid email
            'label': 'not-an-email',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is None

    def test_parse_node_invalid_ip(self):
        """Test that invalid IP address fails validation and returns None."""
        node_data = {
            'type': 'ip',
            'address': '999.999.999.999',  # Invalid IP
            'label': '999.999.999.999',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is None

    def test_parse_node_missing_required_field(self):
        """Test that missing required fields cause validation to fail."""
        node_data = {
            'type': 'email',
            # Missing 'email' field which is required
            'label': 'test',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is None

    def test_parse_node_empty_string_for_required_field(self):
        """Test that empty string for required field is filtered and causes validation to fail."""
        node_data = {
            'type': 'domain',
            'domain': '',  # Empty string should be filtered, causing validation to fail
            'label': 'test',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is None

    def test_parse_node_filters_none_values(self):
        """Test that None values are filtered out."""
        node_data = {
            'type': 'ip',
            'address': '1.2.3.4',
            'label': '1.2.3.4',
            'latitude': None,
            'longitude': None,
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Ip)
        assert result.latitude is None
        assert result.longitude is None

    def test_parse_node_filters_empty_lists(self):
        """Test that empty lists are filtered out."""
        node_data = {
            'type': 'domain',
            'domain': 'example.com',
            'label': 'example.com',
            'some_list_field': [],  # Should be filtered
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Domain)

    def test_parse_node_filters_empty_dicts(self):
        """Test that empty dicts are filtered out."""
        node_data = {
            'type': 'domain',
            'domain': 'example.com',
            'label': 'example.com',
            'some_dict_field': {},  # Should be filtered
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Domain)

    def test_parse_node_empty_data(self):
        """Test that empty node_data returns None."""
        result = parse_node_to_pydantic({})
        assert result is None

    def test_parse_node_none_data(self):
        """Test that None node_data returns None."""
        result = parse_node_to_pydantic(None)
        assert result is None


class TestEdgeCases:
    """Test edge cases and special scenarios."""

    def test_ip_with_string_zero_coordinates(self):
        """Test IP with '0' string for coordinates (edge case from real data)."""
        node_data = {
            'type': 'ip',
            'address': '127.0.0.1',
            'label': '127.0.0.1',
            'latitude': '0',
            'longitude': '0',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Ip)
        # String '0' should be converted to float 0.0
        assert result.latitude == 0.0
        assert result.longitude == 0.0

    def test_domain_with_subdomain(self):
        """Test domain parsing with subdomain."""
        node_data = {
            'type': 'domain',
            'domain': 'sub.example.com',
            'label': 'sub.example.com',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Domain)
        assert result.domain == 'sub.example.com'
        assert result.root == False  # Should be computed as not root

    def test_multiple_neo4j_specific_fields(self):
        """Test that all Neo4j-specific fields are properly filtered."""
        neo4j_fields = {
            'sketch_id': 'test',
            'created_at': '2024-01-01',
            'type': 'domain',
            'caption': 'test caption',
            'x': 100.5,
            'y': 200.5,
            'color': '#FF0000',
        }

        node_data = {
            **neo4j_fields,
            'domain': 'example.com',
            'label': 'example.com',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None
        assert isinstance(result, Domain)
        # Verify only valid fields were used
        assert result.domain == 'example.com'
        assert result.label == 'example.com'


class TestAllTypes:
    """Test parsing for ALL types in the registry."""

    # Mapping of type names to valid minimal data for testing
    # This ensures every type in TYPE_TO_MODEL can be parsed
    VALID_TEST_DATA = {
        'domain': {'domain': 'example.com'},
        'email': {'email': 'test@example.com'},
        'ip': {'address': '192.168.1.1'},
        'phone': {'number': '+33612345678'},
        'username': {'value': 'john_doe'},
        'organization': {'name': 'ACME Corp'},
        'individual': {'first_name': 'John', 'last_name': 'Doe'},
        'socialaccount': {'username': {'value': 'johndoe'}},
        'asn': {'number': 15169},
        'cidr': {'network': '192.168.1.0/24'},
        'cryptowallet': {'address': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'},
        'cryptowallettransaction': {'source': {'address': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'}},
        'cryptonft': {'wallet': {'address': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'}, 'contract_address': '0x' + 'a' * 40, 'token_id': '123'},
        'website': {'url': 'https://example.com'},
        'port': {'number': 443},
        'phrase': {'text': 'test phrase'},
        'breach': {'name': 'Test Breach'},
        'credential': {'username': 'user'},
        'device': {'device_id': 'device-123'},
        'document': {'title': 'Test Document'},
        'file': {'filename': 'test.txt'},
        'malware': {'name': 'TestMalware'},
        'sslcertificate': {'subject': 'CN=example.com'},
        'location': {'address': '123 Main St', 'city': 'Paris', 'country': 'France', 'zip': '75001'},
        'affiliation': {'organization': 'test org'},
        'alias': {'alias': 'test_alias'},
        'bankaccount': {'account_number': '123456789'},
        'creditcard': {'card_number': '4111111111111111'},
        'dnsrecord': {'name': 'example.com', 'record_type': 'A', 'value': '192.168.1.1'},
        'gravatar': {'src': 'https://gravatar.com/avatar/abc', 'hash': 'abc123'},
        'leak': {'name': 'test leak'},
        'message': {'message_id': 'msg-123', 'content': 'test message'},
        'reputationscore': {'entity_id': 'entity-123'},
        'riskprofile': {'entity_id': 'entity-123'},
        'script': {'script_id': 'script-123'},
        'session': {'session_id': 'session-123'},
        'webtracker': {'tracker_id': 'tracker-123'},
        'weapon': {'name': 'Test Weapon'},
        'whois': {'domain': {'domain': 'example.com'}},
    }

    @pytest.mark.parametrize('type_name', list(TYPE_TO_MODEL.keys()))
    def test_type_in_registry_has_test_data(self, type_name):
        """Verify that every type in registry has test data defined."""
        assert type_name in self.VALID_TEST_DATA, \
            f"Type '{type_name}' is in TYPE_TO_MODEL but has no test data in VALID_TEST_DATA. " \
            f"Please add minimal valid data for this type."

    @pytest.mark.parametrize('type_name,model_class', TYPE_TO_MODEL.items())
    def test_parse_all_types_with_valid_data(self, type_name, model_class):
        """Test parsing each type with valid minimal data."""
        if type_name not in self.VALID_TEST_DATA:
            pytest.skip(f"No test data for {type_name}")

        node_data = {
            'type': type_name,
            **self.VALID_TEST_DATA[type_name],
            'label': f'test-{type_name}',
            # Add Neo4j fields that should be filtered
            'sketch_id': 'test-sketch',
            'created_at': '2024-01-01T00:00:00Z',
            'x': 100,
            'y': 200,
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None, f"Failed to parse valid {type_name} data"
        assert isinstance(result, model_class), \
            f"Expected {model_class.__name__} but got {type(result).__name__}"

    @pytest.mark.parametrize('type_name,model_class', TYPE_TO_MODEL.items())
    def test_parse_all_types_with_empty_optional_fields(self, type_name, model_class):
        """Test that empty strings in optional fields don't break parsing."""
        if type_name not in self.VALID_TEST_DATA:
            pytest.skip(f"No test data for {type_name}")

        # Get the required fields from test data
        required_data = self.VALID_TEST_DATA[type_name].copy()

        # Add empty strings for some potential optional fields
        node_data = {
            'type': type_name,
            **required_data,
            'label': f'test-{type_name}',
            'description': '',  # Common optional field
            'metadata': '',
            'tags': '',
            'notes': '',
            'custom_field': '',
        }

        result = parse_node_to_pydantic(node_data)

        assert result is not None, \
            f"Failed to parse {type_name} with empty optional fields"
        assert isinstance(result, model_class)

    def test_type_registry_completeness(self):
        """Verify TYPE_TO_MODEL contains all expected types."""
        # This is a sanity check to ensure the registry isn't empty
        assert len(TYPE_TO_MODEL) > 30, \
            f"TYPE_TO_MODEL should have 30+ types, found {len(TYPE_TO_MODEL)}"

        # Verify some key types are present
        required_types = ['domain', 'email', 'ip', 'phone', 'username', 'organization']
        for type_name in required_types:
            assert type_name in TYPE_TO_MODEL, \
                f"Required type '{type_name}' missing from TYPE_TO_MODEL"

    def test_get_model_for_type_case_insensitive(self):
        """Test that get_model_for_type is case-insensitive."""
        assert get_model_for_type('domain') == get_model_for_type('Domain')
        assert get_model_for_type('EMAIL') == get_model_for_type('email')
        assert get_model_for_type('Ip') == get_model_for_type('ip')
