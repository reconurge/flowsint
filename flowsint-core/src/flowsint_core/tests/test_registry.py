import pytest
from flowsint_core.core.registry import TransformRegistry
from flowsint_core.core.scanner_base import Scanner
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip
from typing import List


class MockScanner(Scanner):
    """Mock scanner for testing registry functionality"""

    InputType = List[Domain]
    OutputType = List[Ip]

    @classmethod
    def name(cls) -> str:
        return "mock_scanner"

    @classmethod
    def category(cls) -> str:
        return "Test"

    @classmethod
    def key(cls) -> str:
        return "domain"

    @classmethod
    def documentation(cls) -> str:
        return "Mock scanner for testing"

    @classmethod
    def get_params_schema(cls) -> List[dict]:
        return []

    @classmethod
    def required_params(cls) -> bool:
        return False

    @classmethod
    def icon(cls) -> str:
        return "test-icon"

    async def scan(self, data: InputType) -> OutputType:
        return []


class TestTransformRegistry:
    """Test suite for TransformRegistry functionality"""

    def setup_method(self):
        """Clear registry before each test"""
        TransformRegistry.clear()

    def test_register_scanner(self):
        """Test registering a scanner"""
        TransformRegistry.register(MockScanner)
        assert TransformRegistry.transform_exists("mock_scanner")

        scanners = TransformRegistry.list()
        assert "mock_scanner" in scanners
        assert scanners["mock_scanner"]["class_name"] == "MockScanner"

    def test_register_invalid_scanner(self):
        """Test that registering a non-scanner class raises error"""

        class NotAScanner:
            pass

        with pytest.raises(ValueError, match="must inherit from Scanner"):
            TransformRegistry.register(NotAScanner)

    def test_get_scanner_instance(self):
        """Test getting a scanner instance"""
        TransformRegistry.register(MockScanner)

        scanner = TransformRegistry.get_scanner(
            "mock_scanner", sketch_id="test_sketch", scan_id="test_scan"
        )

        assert isinstance(scanner, MockScanner)
        assert scanner.sketch_id == "test_sketch"
        assert scanner.scan_id == "test_scan"

    def test_get_nonexistent_scanner(self):
        """Test that getting a non-existent scanner raises exception"""
        with pytest.raises(Exception, match="Scanner 'nonexistent' not found"):
            TransformRegistry.get_scanner(
                "nonexistent", sketch_id="test_sketch", scan_id="test_scan"
            )

    def test_list_by_categories(self):
        """Test listing scanners by category"""
        TransformRegistry.register(MockScanner)

        by_category = TransformRegistry.list_by_categories()
        assert "Test" in by_category
        assert len(by_category["Test"]) == 1
        assert by_category["Test"][0]["name"] == "mock_scanner"

    def test_list_by_input_type(self):
        """Test listing scanners by input type"""
        TransformRegistry.register(MockScanner)

        domain_scanners = TransformRegistry.list_by_input_type("Domain")
        assert len(domain_scanners) == 1
        assert domain_scanners[0]["name"] == "mock_scanner"

        # Test with "any" input type
        any_scanners = TransformRegistry.list_by_input_type("any")
        assert len(any_scanners) == 1
        assert any_scanners[0]["name"] == "mock_scanner"

    def test_register_module(self):
        """Test registering a module path"""
        TransformRegistry.register_module("test.module.path")
        assert "test.module.path" in TransformRegistry._scanner_modules

        # Registering the same module again should not duplicate
        TransformRegistry.register_module("test.module.path")
        assert TransformRegistry._scanner_modules.count("test.module.path") == 1
