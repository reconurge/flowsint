import pytest
from typing import List, Dict, Any
from ..core.scanner_base import Scanner
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip


class MockScanner(Scanner):
    """Mock scanner for testing base functionality"""
    
    # Define InputType and OutputType
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
    def input_schema(cls) -> Dict[str, Any]:
        return cls.generate_input_schema()
    
    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        return cls.generate_output_schema()
    
    async def scan(self, values: List[str]) -> List[Dict[str, Any]]:
        # Mock implementation
        return [{"address": "1.2.3.4"}]


class IncompleteScanner(Scanner):
    """Scanner without InputType/OutputType for testing error cases"""
    
    @classmethod
    def name(cls) -> str:
        return "incomplete_scanner"
    
    @classmethod
    def category(cls) -> str:
        return "Test"
    
    @classmethod
    def key(cls) -> str:
        return "test"
    
    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        return cls.generate_input_schema()
    
    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        return cls.generate_output_schema()
    
    async def scan(self, values: List[str]) -> List[Dict[str, Any]]:
        return []


class TestBaseScannerInputOutputTypes:
    """Test suite for Scanner InputType/OutputType functionality"""
    
    def test_input_type_output_type_class_attributes(self):
        """Test that InputType and OutputType are properly set as class attributes"""
        assert hasattr(MockScanner, 'InputType')
        assert hasattr(MockScanner, 'OutputType')
        assert MockScanner.InputType == List[Domain]
        assert MockScanner.OutputType == List[Ip]
    
    def test_generate_input_schema_success(self):
        """Test that generate_input_schema works correctly with valid InputType"""
        schema = MockScanner.generate_input_schema()
        
        assert isinstance(schema, dict)
        assert "type" in schema
        assert "properties" in schema
        assert schema["type"] == "Domain"
        
        # Check that properties are correctly extracted
        properties = schema["properties"]
        assert isinstance(properties, list)
        
        # Should have domain property
        domain_prop = next((p for p in properties if p["name"] == "domain"), None)
        assert domain_prop is not None
        assert domain_prop["type"] == "string"
    
    def test_generate_output_schema_success(self):
        """Test that generate_output_schema works correctly with valid OutputType"""
        schema = MockScanner.generate_output_schema()
        
        assert isinstance(schema, dict)
        assert "type" in schema
        assert "properties" in schema
        assert schema["type"] == "Ip"
        
        # Check that properties are correctly extracted
        properties = schema["properties"]
        assert isinstance(properties, list)
        
        # Should have address property
        address_prop = next((p for p in properties if p["name"] == "address"), None)
        assert address_prop is not None
        assert address_prop["type"] == "string"
    
    def test_generate_input_schema_not_implemented_error(self):
        """Test that generate_input_schema raises error when InputType is not defined"""
        with pytest.raises(NotImplementedError) as exc_info:
            IncompleteScanner.generate_input_schema()
        
        assert "InputType must be defined" in str(exc_info.value)
        assert "IncompleteScanner" in str(exc_info.value)
    
    def test_generate_output_schema_not_implemented_error(self):
        """Test that generate_output_schema raises error when OutputType is not defined"""
        with pytest.raises(NotImplementedError) as exc_info:
            IncompleteScanner.generate_output_schema()
        
        assert "OutputType must be defined" in str(exc_info.value)
        assert "IncompleteScanner" in str(exc_info.value)
    
    def test_input_output_schema_methods_use_generate_methods(self):
        """Test that the schema methods properly use the generate methods"""
        input_schema = MockScanner.input_schema()
        output_schema = MockScanner.output_schema()
        
        # These should be identical to calling generate methods directly
        assert input_schema == MockScanner.generate_input_schema()
        assert output_schema == MockScanner.generate_output_schema()
    
    def test_base_scanner_has_not_implemented_defaults(self):
        """Test that base Scanner class has NotImplemented defaults"""
        assert Scanner.InputType is NotImplemented
        assert Scanner.OutputType is NotImplemented
    
    def test_inheritance_preserves_input_output_types(self):
        """Test that InputType and OutputType are properly inherited"""
        
        class ChildScanner(MockScanner):
            pass
        
        # Child should inherit the types from MockScanner
        assert ChildScanner.InputType == List[Domain]
        assert ChildScanner.OutputType == List[Ip]
        
        # And schema generation should work
        input_schema = ChildScanner.generate_input_schema()
        output_schema = ChildScanner.generate_output_schema()
        
        assert input_schema["type"] == "Domain"
        assert output_schema["type"] == "Ip"
    
    def test_scanner_instance_can_access_class_types(self):
        """Test that scanner instances can access InputType and OutputType"""
        scanner = MockScanner("test_sketch", "test_scan")
        
        assert scanner.InputType == List[Domain]
        assert scanner.OutputType == List[Ip]
        
        # Instance should be able to call generate methods
        input_schema = scanner.generate_input_schema()
        output_schema = scanner.generate_output_schema()
        
        assert input_schema["type"] == "Domain"
        assert output_schema["type"] == "Ip"


class TestScannerFunctionality:
    """Test other Scanner base functionality"""
    
    def test_scanner_initialization(self):
        """Test that Scanner initializes correctly"""
        scanner = MockScanner("test_sketch", "test_scan")
        
        assert scanner.sketch_id == "test_sketch"
        assert scanner.scan_id == "test_scan"
        assert scanner.params == {}
        assert scanner.params_schema == []
    
    def test_scanner_initialization_with_defaults(self):
        """Test Scanner initialization with default values"""
        scanner = MockScanner()
        
        assert scanner.sketch_id == "system"
        assert scanner.scan_id == "default"
    
    @pytest.mark.asyncio
    async def test_scanner_execute_method(self):
        """Test the execute method workflow"""
        scanner = MockScanner("test_sketch", "test_scan")
        
        result = await scanner.execute(["test.com"])
        
        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0]["address"] == "1.2.3.4" 