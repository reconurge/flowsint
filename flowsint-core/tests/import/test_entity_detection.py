"""Unit tests for entity_detection module."""
import pytest
from flowsint_core.imports.entity_detection import (
    detect_entity_type,
    is_email,
    is_domain,
    is_ip_address,
    is_website,
    is_phone,
    is_asn,
    is_username,
    get_default_label,
)


class TestEmailDetection:
    """Tests for email detection."""

    def test_valid_emails(self):
        """Test detection of valid email addresses."""
        valid_emails = [
            "user@example.com",
            "test.user@domain.co.uk",
            "admin+tag@company.org",
            "user_name@sub.domain.com",
            "123@numbers.com",
        ]
        for email in valid_emails:
            assert is_email(email), f"Failed to detect valid email: {email}"
            assert detect_entity_type(email) == "Email"

    def test_invalid_emails(self):
        """Test rejection of invalid email addresses."""
        invalid_emails = [
            "not-an-email",
            "@example.com",
            "user@",
            "user@domain",
            "user domain@example.com",
            "",
        ]
        for email in invalid_emails:
            assert not is_email(email), f"Incorrectly detected as email: {email}"


class TestDomainDetection:
    """Tests for domain detection."""

    def test_valid_domains(self):
        """Test detection of valid domains."""
        valid_domains = [
            "example.com",
            "sub.domain.com",
            "my-domain.co.uk",
            "test123.org",
            "a.b.c.d.example.com",
        ]
        for domain in valid_domains:
            assert is_domain(domain), f"Failed to detect valid domain: {domain}"
            assert detect_entity_type(domain) == "Domain"

    def test_invalid_domains(self):
        """Test rejection of invalid domains."""
        invalid_domains = [
            "not-a-domain",
            ".com",
            "domain.",
            "http://example.com",  # This is a website, not a domain
            "",
            "192.168.1.1",  # This is an IP
        ]
        for domain in invalid_domains:
            assert not is_domain(domain), f"Incorrectly detected as domain: {domain}"


class TestIPAddressDetection:
    """Tests for IP address detection."""

    def test_valid_ipv4(self):
        """Test detection of valid IPv4 addresses."""
        valid_ips = [
            "192.168.1.1",
            "10.0.0.1",
            "172.16.0.1",
            "8.8.8.8",
            "255.255.255.255",
        ]
        for ip in valid_ips:
            assert is_ip_address(ip), f"Failed to detect valid IPv4: {ip}"
            assert detect_entity_type(ip) == "IP"

    def test_valid_ipv6(self):
        """Test detection of valid IPv6 addresses."""
        valid_ips = [
            "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
            "2001:db8::1",
            "::1",
            "fe80::1",
        ]
        for ip in valid_ips:
            assert is_ip_address(ip), f"Failed to detect valid IPv6: {ip}"
            assert detect_entity_type(ip) == "IP"

    def test_invalid_ips(self):
        """Test rejection of invalid IP addresses."""
        invalid_ips = [
            "256.256.256.256",
            "192.168.1",
            "not-an-ip",
            "",
        ]
        for ip in invalid_ips:
            assert not is_ip_address(ip), f"Incorrectly detected as IP: {ip}"


class TestWebsiteDetection:
    """Tests for website/URL detection."""

    def test_valid_websites(self):
        """Test detection of valid URLs."""
        valid_urls = [
            "http://example.com",
            "https://www.example.com",
            "http://sub.domain.com/path",
            "https://example.com:8080/path?query=value",
        ]
        for url in valid_urls:
            assert is_website(url), f"Failed to detect valid URL: {url}"
            assert detect_entity_type(url) == "Website"

    def test_invalid_websites(self):
        """Test rejection of invalid URLs."""
        invalid_urls = [
            "example.com",
            "ftp://example.com",
            "not-a-url",
            "",
        ]
        for url in invalid_urls:
            assert not is_website(url), f"Incorrectly detected as website: {url}"


class TestPhoneDetection:
    """Tests for phone number detection."""

    def test_valid_phones(self):
        """Test detection of valid phone numbers."""
        valid_phones = [
            "+1234567890",
            "123-456-7890",
            "(123) 456-7890",
            "+44 20 7123 4567",
            "555.123.4567",
            "5551234567",
        ]
        for phone in valid_phones:
            assert is_phone(phone), f"Failed to detect valid phone: {phone}"
            assert detect_entity_type(phone) == "Phone"

    def test_invalid_phones(self):
        """Test rejection of invalid phone numbers."""
        invalid_phones = [
            "123",  # Too short
            "abc-def-ghij",
            "",
            "1234567890123456",  # Too long
        ]
        for phone in invalid_phones:
            assert not is_phone(phone), f"Incorrectly detected as phone: {phone}"


class TestASNDetection:
    """Tests for ASN detection."""

    def test_valid_asns(self):
        """Test detection of valid ASNs."""
        valid_asns = [
            "AS13335",
            "as64512",
            "AS1",
            "AS4294967295",
        ]
        for asn in valid_asns:
            assert is_asn(asn), f"Failed to detect valid ASN: {asn}"
            assert detect_entity_type(asn) == "ASN"

    def test_invalid_asns(self):
        """Test rejection of invalid ASNs."""
        invalid_asns = [
            "13335",
            "ASN13335",
            "AS",
            "",
        ]
        for asn in invalid_asns:
            assert not is_asn(asn), f"Incorrectly detected as ASN: {asn}"


class TestUsernameDetection:
    """Tests for username detection."""

    def test_valid_usernames(self):
        """Test detection of valid usernames."""
        valid_usernames = [
            "@john_doe",
            "@user123",
            "username",
            "user_name_123",
        ]
        for username in valid_usernames:
            assert is_username(username), f"Failed to detect valid username: {username}"
            assert detect_entity_type(username) == "Username"

    def test_invalid_usernames(self):
        """Test rejection of invalid usernames."""
        invalid_usernames = [
            "ab",  # Too short
            "@",
            "123456789",  # Purely numeric
            "user@domain.com",  # This is an email
            "",
            "a" * 31,  # Too long
        ]
        for username in invalid_usernames:
            assert not is_username(username), f"Incorrectly detected as username: {username}"


class TestDetectionPriority:
    """Tests for detection priority and edge cases."""

    def test_email_vs_username(self):
        """Email should take priority over username."""
        assert detect_entity_type("user@example.com") == "Email"

    def test_url_vs_domain(self):
        """URL should take priority over domain."""
        assert detect_entity_type("http://example.com") == "Website"
        assert detect_entity_type("example.com") == "Domain"

    def test_ip_vs_domain(self):
        """IP should be correctly distinguished from domain."""
        assert detect_entity_type("192.168.1.1") == "IP"
        assert detect_entity_type("example.com") == "Domain"

    def test_whitespace_handling(self):
        """Test that whitespace is properly handled."""
        assert detect_entity_type("  user@example.com  ") == "Email"
        assert detect_entity_type(" example.com ") == "Domain"

    def test_none_and_empty(self):
        """Test handling of None and empty strings."""
        assert detect_entity_type("") is None
        assert detect_entity_type("   ") is None
        assert detect_entity_type(None) is None


class TestGetDefaultLabel:
    """Tests for get_default_label function."""

    def test_email_label(self):
        """Test label generation for email."""
        assert get_default_label("Email", "user@example.com") == "user@example.com"

    def test_domain_label(self):
        """Test label generation for domain."""
        assert get_default_label("Domain", "example.com") == "example.com"

    def test_ip_label(self):
        """Test label generation for IP."""
        assert get_default_label("IP", "192.168.1.1") == "192.168.1.1"

    def test_username_label(self):
        """Test label generation for username (strips @ prefix)."""
        assert get_default_label("Username", "@john_doe") == "john_doe"
        assert get_default_label("Username", "john_doe") == "john_doe"

    def test_phone_label(self):
        """Test label generation for phone."""
        assert get_default_label("Phone", "+1234567890") == "+1234567890"

    def test_asn_label(self):
        """Test label generation for ASN."""
        assert get_default_label("ASN", "AS13335") == "AS13335"

    def test_website_label(self):
        """Test label generation for website."""
        assert get_default_label("Website", "https://example.com") == "https://example.com"

    def test_organization_label(self):
        """Test label generation for organization."""
        assert get_default_label("Organization", "ACME Corp") == "ACME Corp"

    def test_individual_label(self):
        """Test label generation for individual."""
        assert get_default_label("Individual", "John Doe") == "John Doe"

    def test_unknown_type(self):
        """Test label generation for unknown type."""
        assert get_default_label("UnknownType", "some value") == "some value"
