"""Integration tests for import functionality (entity-based)."""
import pytest
from flowsint_core.imports import parse_file


class TestEntityBasedImportWorkflow:
    """Integration tests for entity-based import workflow."""

    def test_full_entity_workflow(self):
        """Test complete workflow: parse file -> detect entities -> prepare for import."""
        # Step 1: User uploads a CSV file (each row = one entity)
        csv_content = b"""email,name,department
admin@example.com,John Admin,IT
user@test.org,Jane User,HR
security@company.com,Bob Security,Security
"""

        # Step 2: Parse and analyze the file
        result = parse_file(csv_content, "test.csv")

        # Verify parsing - entities instead of rows
        assert result.total_entities == 3
        assert len(result.entities) == 3

        # Verify entity detection
        assert all(e.detected_type == "Email" for e in result.entities)

        # Step 3: User reviews entities (can change type/label)
        entity_mappings = []
        for entity in result.entities:
            entity_mappings.append({
                "row_index": entity.row_index,
                "entity_type": entity.detected_type,
                "label": entity.primary_value,
                "include": True
            })

        # Verify mappings
        assert len(entity_mappings) == 3
        assert all(m["entity_type"] == "Email" for m in entity_mappings)

        # Step 4: Verify all data is preserved in entity
        first_entity = result.entities[0]
        assert "email" in first_entity.data
        assert "name" in first_entity.data
        assert "department" in first_entity.data

    def test_txt_entity_workflow(self):
        """Test workflow for TXT file where each line is an entity."""
        txt_content = b"""example.com
192.168.1.1
user@example.com
AS13335
"""

        result = parse_file(txt_content, "entities.txt")

        assert result.total_entities == 4
        assert len(result.entities) == 4

        # Each line is detected as different type
        types = {e.detected_type for e in result.entities}
        assert "Domain" in types
        assert "Ip" in types
        assert "Email" in types
        assert "ASN" in types

    def test_user_corrections_workflow(self):
        """Test workflow where user corrects detected types."""
        csv_content = b"""identifier,category,notes
john_doe,username,Social media handle
example.com,domain,Main website
192.168.1.1,server,Production server
"""

        # Parse file
        result = parse_file(csv_content, "data.csv")

        # Simulate user reviewing and correcting types
        entity_mappings = []
        for entity in result.entities:
            # User can override detected type
            if entity.data.get("category") == "server":
                # User wants custom type instead of detected "Ip"
                entity_type = "Device"
            else:
                entity_type = entity.detected_type

            entity_mappings.append({
                "row_index": entity.row_index,
                "entity_type": entity_type,
                "label": entity.primary_value,
                "include": True
            })

        # Verify overrides
        assert entity_mappings[0]["entity_type"] == "Username"
        assert entity_mappings[1]["entity_type"] == "Domain"
        assert entity_mappings[2]["entity_type"] == "Device"  # User override

    def test_label_customization(self):
        """Test customizing labels for entities."""
        csv_content = b"""email,full_name,role
admin@company.com,John Administrator,Admin
security@company.com,Jane Security,SecOps
"""

        result = parse_file(csv_content, "contacts.csv")

        # User customizes labels with additional context
        entity_mappings = []
        for entity in result.entities:
            # Combine email with full name for label
            custom_label = f"{entity.data['email']} ({entity.data['full_name']})"
            entity_mappings.append({
                "row_index": entity.row_index,
                "entity_type": entity.detected_type,
                "label": custom_label,
                "include": True
            })

        # Verify customized labels
        assert "John Administrator" in entity_mappings[0]["label"]
        assert "Jane Security" in entity_mappings[1]["label"]

    def test_selective_import(self):
        """Test excluding specific entities from import."""
        csv_content = b"""email,status
active@example.com,active
inactive@test.org,inactive
admin@company.com,active
"""

        result = parse_file(csv_content, "users.csv")

        # User only wants to import active users
        entity_mappings = []
        for entity in result.entities:
            include = entity.data.get("status") == "active"
            entity_mappings.append({
                "row_index": entity.row_index,
                "entity_type": entity.detected_type,
                "label": entity.primary_value,
                "include": include
            })

        # Verify selective inclusion
        included = [m for m in entity_mappings if m["include"]]
        assert len(included) == 2


class TestRealWorldEntityScenarios:
    """Real-world scenario tests with entity-based approach."""

    def test_organization_import(self):
        """Test importing organizations with metadata."""
        csv_content = b"""name,industry,country,employees
Google,Technology,USA,150000
Microsoft,Software,USA,220000
Apple,Technology,USA,164000
"""

        result = parse_file(csv_content, "orgs.csv")

        assert result.total_entities == 3
        assert all(e.detected_type == "Organization" for e in result.entities)

        # Verify all metadata preserved
        for entity in result.entities:
            assert "name" in entity.data
            assert "industry" in entity.data
            assert "country" in entity.data
            assert "employees" in entity.data

    def test_threat_intel_import(self):
        """Test importing threat intelligence data."""
        csv_content = b"""domain,severity,first_seen,description,malware_family
malicious.com,high,2024-01-15,Phishing domain,TrickBot
evil.net,critical,2024-01-16,C2 server,Cobalt Strike
threat.xyz,high,2024-01-18,APT infrastructure,Unknown
"""

        result = parse_file(csv_content, "iocs.csv")

        assert result.total_entities == 3
        assert all(e.detected_type == "Domain" for e in result.entities)

        # Verify threat metadata preserved in entity data
        first_entity = result.entities[0]
        assert first_entity.data["severity"] == "high"
        assert first_entity.data["malware_family"] == "TrickBot"
        assert "description" in first_entity.data

    def test_infrastructure_mapping(self):
        """Test importing infrastructure with multiple related fields."""
        csv_content = b"""domain,ip,asn,country,provider
cloudflare.com,1.1.1.1,AS13335,USA,Cloudflare
google.com,8.8.8.8,AS15169,USA,Google
"""

        result = parse_file(csv_content, "infrastructure.csv")

        assert result.total_entities == 2

        # All related data preserved in entity
        for entity in result.entities:
            assert "domain" in entity.data
            assert "ip" in entity.data
            assert "asn" in entity.data
            assert "country" in entity.data
            assert "provider" in entity.data


class TestTypeDistribution:
    """Tests for type distribution in entity-based approach."""

    def test_mixed_entity_types(self):
        """Test file with multiple entity types."""
        txt_content = b"""example.com
test.org
user@example.com
admin@test.org
192.168.1.1
10.0.0.1
"""

        result = parse_file(txt_content, "mixed.txt")

        # Check type distribution
        assert result.type_distribution["Domain"] == 2
        assert result.type_distribution["Email"] == 2
        assert result.type_distribution["Ip"] == 2

    def test_predominant_type_detection(self):
        """Test that predominant type is correctly identified."""
        csv_content = b"""email,notes
user1@example.com,User account
user2@example.com,Admin account
user3@example.com,Guest account
user4@example.com,Service account
"""

        result = parse_file(csv_content, "emails.csv")

        # Should have high confidence for Email type
        assert all(e.detected_type == "Email" for e in result.entities)
        assert all(e.confidence == "high" for e in result.entities)


class TestEdgeCases:
    """Edge case tests for entity-based import."""

    def test_single_column_csv(self):
        """Test CSV with single column."""
        csv_content = b"""email
user@example.com
admin@test.org
"""

        result = parse_file(csv_content, "single_column.csv")

        assert result.total_entities == 2
        assert all(e.detected_type == "Email" for e in result.entities)

    def test_many_columns_csv(self):
        """Test CSV with many columns (all become entity data)."""
        csv_content = b"""email,name,dept,role,location,phone,manager,start_date
user@example.com,John,IT,Dev,NYC,555-1234,admin@example.com,2024-01-01
"""

        result = parse_file(csv_content, "detailed.csv")

        assert result.total_entities == 1
        entity = result.entities[0]

        # All 8 columns should be in entity data
        assert len(entity.data) == 8
        assert "email" in entity.data
        assert "manager" in entity.data
        assert "start_date" in entity.data

    def test_unknown_type_handling(self):
        """Test handling of unknown/undetectable types."""
        txt_content = b"""random text string
another random value
unstructured data
"""

        result = parse_file(txt_content, "unknown.txt")

        # Should still parse but mark as Unknown
        assert result.total_entities == 3
        assert all(e.detected_type == "Unknown" for e in result.entities)
        assert all(e.confidence == "low" for e in result.entities)
