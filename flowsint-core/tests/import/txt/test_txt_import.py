"""Comprehensive tests for TXT import functionality.

Tests automatic entity detection and parsing of plain text files.
"""

import pytest
from flowsint_core.imports.txt.parse_txt import parse_txt
from flowsint_types import CIDR, Domain, Email, Ip, Phone, Username, Website

from flowsint_core.imports import parse_import_file


class TestBasicTxtParsing:
    """Tests for basic TXT file parsing functionality."""

    def test_simple_txt_file(self):
        """Test parsing a simple TXT file with basic entities."""
        txt_content = b"example.com\n192.168.1.1\nuser@example.com"

        result = parse_txt(txt_content, max_preview_rows=100)

        assert result.total_entities == 3
        assert len(result.entities) > 0

    def test_single_line(self):
        """Test parsing a file with a single line."""
        txt_content = b"example.com"

        result = parse_txt(txt_content, max_preview_rows=100)

        assert result.total_entities == 1

    def test_multiple_same_type(self):
        """Test parsing multiple entities of the same type."""
        txt_content = b"example.com\ntest.com\ndomain.org"

        result = parse_txt(txt_content, max_preview_rows=100)

        assert result.total_entities == 3
        if "Domain" in result.entities:
            assert len(result.entities["Domain"].results) == 3

    def test_mixed_entity_types(self):
        """Test parsing file with mixed entity types."""
        txt_content = b"""example.com
192.168.1.1
user@test.com
+1-555-0100
https://example.com"""

        result = parse_txt(txt_content, max_preview_rows=100)

        assert result.total_entities == 5
        # Should have multiple entity types
        assert len(result.entities) >= 3


class TestWhitespaceHandling:
    """Tests for handling whitespace and line formatting."""

    def test_lines_with_trailing_whitespace(self):
        """Test that trailing whitespace is stripped."""
        txt_content = b"example.com   \ntest.com\t\n"

        result = parse_txt(txt_content, max_preview_rows=100)

        assert result.total_entities == 2

    def test_lines_with_leading_whitespace(self):
        """Test that leading whitespace is stripped."""
        txt_content = b"  example.com\n\ttest.com"

        result = parse_txt(txt_content, max_preview_rows=100)

        assert result.total_entities == 2

    def test_empty_lines_ignored(self):
        """Test that empty lines are filtered out."""
        txt_content = b"""example.com

test.com


domain.org
"""

        result = parse_txt(txt_content, max_preview_rows=100)

        # Only 3 non-empty lines
        assert result.total_entities == 3

    def test_whitespace_only_lines(self):
        """Test that whitespace-only lines are ignored."""
        txt_content = b"""example.com

\t
test.com
"""

        result = parse_txt(txt_content, max_preview_rows=100)

        assert result.total_entities == 2

    def test_different_line_endings(self):
        """Test handling of different line ending styles."""
        # Unix-style (LF)
        unix_content = b"example.com\ntest.com\ndomain.org"
        result_unix = parse_txt(unix_content, max_preview_rows=100)
        assert result_unix.total_entities == 3

        # Windows-style (CRLF)
        windows_content = b"example.com\r\ntest.com\r\ndomain.org"
        result_windows = parse_txt(windows_content, max_preview_rows=100)
        assert result_windows.total_entities == 3

        # Mixed
        mixed_content = b"example.com\ntest.com\r\ndomain.org"
        result_mixed = parse_txt(mixed_content, max_preview_rows=100)
        assert result_mixed.total_entities == 3


class TestEncodingHandling:
    """Tests for handling different text encodings."""

    def test_utf8_encoding(self):
        """Test parsing UTF-8 encoded file."""
        txt_content = "example.com\ntest.com".encode("utf-8")

        result = parse_txt(txt_content, max_preview_rows=100)

        assert result.total_entities == 2

    def test_latin1_encoding(self):
        """Test parsing Latin-1 encoded file."""
        txt_content = "example.com\ntest.com".encode("latin-1")

        result = parse_txt(txt_content, max_preview_rows=100)

        assert result.total_entities == 2

    def test_utf8_with_special_chars(self):
        """Test UTF-8 file with special characters (should still parse entities)."""
        # Include some special characters but also valid entities
        txt_content = "example.com\ntest.com\nété.com".encode("utf-8")

        result = parse_txt(txt_content, max_preview_rows=100)

        # At minimum, the valid domains should parse
        assert result.total_entities >= 2


class TestEntityTypeDetection:
    """Tests for automatic entity type detection."""

    def test_domain_detection(self):
        """Test detection of domain entities."""
        txt_content = b"example.com\ntest.org\nsubdomain.example.net"

        result = parse_txt(txt_content, max_preview_rows=100)

        assert "Domain" in result.entities
        assert len(result.entities["Domain"].results) == 3

    def test_ip_detection(self):
        """Test detection of IP address entities."""
        txt_content = b"192.168.1.1\n10.0.0.1\n8.8.8.8"

        result = parse_txt(txt_content, max_preview_rows=100)

        assert "Ip" in result.entities
        assert len(result.entities["Ip"].results) == 3

    def test_email_detection(self):
        """Test detection of email entities."""
        txt_content = b"user@example.com\ntest@test.org\nadmin@domain.net"

        result = parse_txt(txt_content, max_preview_rows=100)

        assert "Email" in result.entities
        assert len(result.entities["Email"].results) == 3

    def test_phone_detection(self):
        """Test detection of phone number entities."""
        txt_content = b"+1-555-0100\n555-0200\n+44-20-1234-5678"

        result = parse_txt(txt_content, max_preview_rows=100)

        # Phone detection might be present
        assert result.total_entities >= 1

    def test_url_detection(self):
        """Test detection of URL/Website entities."""
        txt_content = (
            b"https://example.com\nhttp://test.org\nhttps://subdomain.example.net/path"
        )

        result = parse_txt(txt_content, max_preview_rows=100)

        # URLs should be detected as Website or similar
        assert result.total_entities == 3

    def test_cidr_detection(self):
        """Test detection of CIDR notation."""
        txt_content = b"192.168.1.0/24\n10.0.0.0/8"

        result = parse_txt(txt_content, max_preview_rows=100)

        # CIDR should be detected
        assert result.total_entities >= 1

    def test_username_detection(self):
        """Test detection of username entities."""
        txt_content = b"my_username\nuser123\ntest_user_name"

        result = parse_txt(txt_content, max_preview_rows=100)

        # Usernames should be detected
        assert result.total_entities >= 1


class TestMaxPreviewRows:
    """Tests for max_preview_rows parameter."""

    def test_respects_max_preview_rows(self):
        """Test that max_preview_rows limits entities in preview."""
        # Create 100 lines
        lines = [f"domain{i}.com" for i in range(100)]
        txt_content = "\n".join(lines).encode("utf-8")

        result = parse_txt(txt_content, max_preview_rows=10)

        # Total should be 100, but entities dict should only have 10
        assert result.total_entities == 100
        total_in_entities = sum(len(e.results) for e in result.entities.values())
        assert total_in_entities == 10

    def test_max_preview_rows_larger_than_file(self):
        """Test when max_preview_rows is larger than file content."""
        txt_content = b"example.com\ntest.com\ndomain.org"

        result = parse_txt(txt_content, max_preview_rows=1000)

        assert result.total_entities == 3
        total_in_entities = sum(len(e.results) for e in result.entities.values())
        assert total_in_entities == 3

    def test_max_preview_rows_zero(self):
        """Test with max_preview_rows=0."""
        txt_content = b"example.com\ntest.com\ndomain.org"

        result = parse_txt(txt_content, max_preview_rows=0)

        # Should still count total but not include in entities
        assert result.total_entities == 3
        # Entities dict should be empty or very small
        total_in_entities = sum(len(e.results) for e in result.entities.values())
        assert total_in_entities == 0


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_empty_file(self):
        """Test handling of empty file."""
        txt_content = b""

        with pytest.raises(ValueError) as exc_info:
            parse_txt(txt_content, max_preview_rows=100)

        assert "empty" in str(exc_info.value).lower()

    def test_file_with_only_whitespace(self):
        """Test handling of file with only whitespace."""
        txt_content = b"   \n\t\n   \n"

        with pytest.raises(ValueError) as exc_info:
            parse_txt(txt_content, max_preview_rows=100)

        assert "empty" in str(exc_info.value).lower()

    def test_file_with_only_newlines(self):
        """Test handling of file with only newlines."""
        txt_content = b"\n\n\n\n"

        with pytest.raises(ValueError) as exc_info:
            parse_txt(txt_content, max_preview_rows=100)

        assert "empty" in str(exc_info.value).lower()

    def test_unknown_entity_types(self):
        """Test handling of unrecognized entity types."""
        txt_content = b"example.com\nrandom_text_12345\ntest.com"

        result = parse_txt(txt_content, max_preview_rows=100)

        # Should still parse recognized entities
        # Unknown types might be included or skipped
        assert result.total_entities == 3

    def test_malformed_entities(self):
        """Test handling of malformed entity strings."""
        txt_content = b"example.com\n@@@invalid@@@\ntest.com"

        result = parse_txt(txt_content, max_preview_rows=100)

        # Should parse valid entities, skip invalid ones
        assert result.total_entities == 3

    def test_very_long_lines(self):
        """Test handling of very long lines."""
        long_domain = "subdomain." * 100 + "example.com"
        txt_content = f"{long_domain}\ntest.com".encode("utf-8")

        result = parse_txt(txt_content, max_preview_rows=100)

        # Should handle long lines without crashing
        assert result.total_entities == 2

    def test_binary_content_as_text(self):
        """Test handling of binary content."""
        # Binary data that's not valid text
        binary_content = bytes([0x00, 0x01, 0x02, 0xFF, 0xFE])

        # Should handle gracefully (might decode as latin-1 or raise error)
        try:
            result = parse_txt(binary_content, max_preview_rows=100)
            # If it doesn't raise, check it handles it
            assert isinstance(result.total_entities, int)
        except ValueError:
            # Also acceptable to raise ValueError
            pass


class TestIntegration:
    """Integration tests with parse_import_file."""

    def test_parse_import_file_txt(self):
        """Test full import pipeline with TXT format."""
        txt_content = b"example.com\n192.168.1.1\nuser@test.com"
        file_name = "test.txt"

        result = parse_import_file(txt_content, file_name, max_preview_rows=100)

        assert result.total_entities == 3
        assert len(result.entities) >= 2

    def test_parse_import_file_comprehensive(self):
        """Test comprehensive TXT import with various entity types."""
        txt_content = b"""example.com
test.org
192.168.1.1
10.0.0.1
user@example.com
admin@test.org
https://example.com
http://test.org
my_username
test_user"""

        file_name = "comprehensive.txt"
        result = parse_import_file(txt_content, file_name, max_preview_rows=100)

        assert result.total_entities == 10
        # Should have detected multiple types
        assert len(result.entities) >= 3


class TestEntityPreviewObjects:
    """Tests for EntityPreview objects created from TXT parsing."""

    def test_domain_entity_preview(self):
        """Test that Domain entities are properly created."""
        txt_content = b"example.com"

        result = parse_txt(txt_content, max_preview_rows=100)

        if "Domain" in result.entities:
            entity_preview = result.entities["Domain"].results[0]
            assert entity_preview.detected_type == "Domain"
            assert isinstance(entity_preview.obj, Domain)
            assert entity_preview.obj.domain == "example.com"

    def test_ip_entity_preview(self):
        """Test that IP entities are properly created."""
        txt_content = b"192.168.1.1"

        result = parse_txt(txt_content, max_preview_rows=100)

        if "Ip" in result.entities:
            entity_preview = result.entities["Ip"].results[0]
            assert entity_preview.detected_type == "Ip"
            assert isinstance(entity_preview.obj, Ip)
            assert entity_preview.obj.address == "192.168.1.1"

    def test_email_entity_preview(self):
        """Test that Email entities are properly created."""
        txt_content = b"user@example.com"

        result = parse_txt(txt_content, max_preview_rows=100)

        if "Email" in result.entities:
            entity_preview = result.entities["Email"].results[0]
            assert entity_preview.detected_type == "Email"
            assert isinstance(entity_preview.obj, Email)
            assert entity_preview.obj.email == "user@example.com"


class TestRealWorldScenarios:
    """Tests simulating real-world usage scenarios."""

    def test_ioc_list(self):
        """Test parsing an IOC (Indicators of Compromise) list."""
        ioc_content = b"""# Malicious domains
malware.com
badactor.org
phishing-site.net

# Malicious IPs
198.51.100.1
203.0.113.5

# Command and control URLs
https://c2.malware.com/callback
http://evil.org/payload
"""

        result = parse_txt(ioc_content, max_preview_rows=100)

        # Comments and empty lines should be filtered
        # Should detect domains, IPs, and URLs
        assert result.total_entities >= 7

    def test_asset_inventory(self):
        """Test parsing an asset inventory list."""
        asset_content = b"""web-server-1.company.com
web-server-2.company.com
db-server.company.com
10.0.1.10
10.0.1.11
10.0.2.5
"""

        result = parse_txt(asset_content, max_preview_rows=100)

        assert result.total_entities == 6
        # Should have both domains and IPs
        assert len(result.entities) >= 2

    def test_email_list(self):
        """Test parsing an email distribution list."""
        email_content = b"""admin@company.com
support@company.com
sales@company.com
info@company.com
contact@company.com
"""

        result = parse_txt(email_content, max_preview_rows=100)

        assert result.total_entities == 5
        if "Email" in result.entities:
            assert len(result.entities["Email"].results) == 5

    def test_mixed_investigation_data(self):
        """Test parsing mixed data from an investigation."""
        investigation_content = b"""suspect@email.com
192.168.1.100
suspicious-domain.com
https://malicious-site.org/payload
+1-555-0123
backup-server.company.internal
10.0.0.50
"""

        result = parse_txt(investigation_content, max_preview_rows=100)

        # Should detect multiple entity types
        assert result.total_entities == 7
        assert len(result.entities) >= 3
