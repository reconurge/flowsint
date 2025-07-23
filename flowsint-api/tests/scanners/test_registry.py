import pytest
from app.scanners.registry import ScannerRegistry
from app.scanners.base import Scanner

class TestScannerRegistry:
    """Test suite for ScannerRegistry functionality"""

    def test_registry_is_populated(self):
        """Test that the registry is populated with scanners"""
        scanners = ScannerRegistry.list()
        assert len(scanners) > 0
        assert isinstance(scanners, dict)

    def test_list_returns_proper_structure(self):
        """Test that list() returns the expected structure"""
        scanners = ScannerRegistry.list()
        
        # Check that each scanner has the expected keys
        for name, scanner_info in scanners.items():
            assert "class_name" in scanner_info
            assert "name" in scanner_info
            assert "module" in scanner_info
            assert "doc" in scanner_info
            assert "category" in scanner_info
            assert "inputs" in scanner_info
            assert "outputs" in scanner_info
            assert "params" in scanner_info
            assert "params_schema" in scanner_info
            assert "required_params" in scanner_info
            
            # Check that name matches the key
            assert scanner_info["name"] == name

    def test_list_by_categories_structure(self):
        """Test that list_by_categories() returns the expected structure"""
        scanners_by_category = ScannerRegistry.list_by_categories()
        
        assert isinstance(scanners_by_category, dict)
        
        # Check that each category contains a list of scanners
        for category, scanners in scanners_by_category.items():
            assert isinstance(scanners, list)
            assert len(scanners) > 0
            
            for scanner_info in scanners:
                assert "class_name" in scanner_info
                assert "name" in scanner_info
                assert "category" in scanner_info
                assert scanner_info["category"] == category

    def test_list_by_input_type_filtering(self):
        """Test that list_by_input_type() properly filters scanners"""
        # Test with a known input type
        domain_scanners = ScannerRegistry.list_by_input_type("Domain")
        
        assert isinstance(domain_scanners, list)
        for scanner_info in domain_scanners:
            input_type = scanner_info["inputs"]["type"]
            assert input_type in ["Any", "Domain"]

    def test_scanner_exists_method(self):
        """Test the scanner_exists method"""
        # Get a real scanner name from the registry
        scanners = ScannerRegistry.list()
        if scanners:
            real_scanner_name = list(scanners.keys())[0]
            assert ScannerRegistry.scanner_exists(real_scanner_name) is True
        
        # Test with non-existent scanner
        assert ScannerRegistry.scanner_exists("non_existent_scanner") is False

    def test_get_scanner_valid(self):
        """Test getting a valid scanner instance"""
        scanners = ScannerRegistry.list()
        if scanners:
            scanner_name = list(scanners.keys())[0]
            scanner_instance = ScannerRegistry.get_scanner(
                scanner_name, 
                sketch_id="test_sketch", 
                scan_id="test_scan"
            )
            assert isinstance(scanner_instance, Scanner)
            assert scanner_instance.sketch_id == "test_sketch"
            assert scanner_instance.scan_id == "test_scan"

    def test_get_scanner_invalid(self):
        """Test getting an invalid scanner raises exception"""
        with pytest.raises(Exception, match="Scanner 'invalid_scanner' not found"):
            ScannerRegistry.get_scanner(
                "invalid_scanner",
                sketch_id="test_sketch",
                scan_id="test_scan"
            )

    def test_specific_scanners_are_registered(self):
        """Test that specific expected scanners are registered"""
        scanners = ScannerRegistry.list()
        
        # Check for some key scanners that should be registered
        expected_scanners = [
            "domain_resolve_scanner",
            "domain_subdomains_scanner", 
            "to_whois",
            "ip_geolocation_scanner",
            "maigret_scanner"
        ]
        
        for expected_scanner in expected_scanners:
            assert expected_scanner in scanners, f"Scanner '{expected_scanner}' not found in registry"

    def test_crypto_scanners_are_registered(self):
        """Test that crypto scanners are registered"""
        scanners = ScannerRegistry.list()
        
        crypto_scanners = [
            "wallet_to_transactions",
            "wallet_to_nfts"
        ]
        
        for crypto_scanner in crypto_scanners:
            assert crypto_scanner in scanners, f"Crypto scanner '{crypto_scanner}' not found in registry"

    def test_scanner_categories_are_valid(self):
        """Test that all scanners have valid categories"""
        scanners = ScannerRegistry.list()
        
        for name, scanner_info in scanners.items():
            category = scanner_info["category"]
            assert isinstance(category, str), f"Scanner '{name}' has invalid category type: {type(category)}"
            # Note: We don't enforce that category must be in valid_categories 
            # since new categories might be added

    def test_scanner_input_output_schemas_exist(self):
        """Test that all scanners have input and output schemas"""
        scanners = ScannerRegistry.list()
        
        for _, scanner_info in scanners.items():
            # Check input schema
            input_schema = scanner_info["inputs"]
            assert isinstance(input_schema, dict)
            assert "type" in input_schema
            assert "properties" in input_schema
            
            # Check output schema
            output_schema = scanner_info["outputs"]
            assert isinstance(output_schema, dict)
            assert "type" in output_schema
            assert "properties" in output_schema

    def test_scanner_required_params_is_boolean(self):
        """Test that required_params returns a boolean for all scanners"""
        scanners = ScannerRegistry.list()
        
        for name, scanner_info in scanners.items():
            required_params = scanner_info["required_params"]
            assert isinstance(required_params, bool), f"Scanner '{name}' required_params is not boolean: {type(required_params)}" 