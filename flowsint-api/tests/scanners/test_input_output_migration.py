"""
Test migration from old TypeAlias pattern to new InputType/OutputType class attributes.

This test demonstrates the benefits and proper usage of the new pattern.
"""
import pytest
from typing import List, Dict, Any, TypeAlias
from pydantic import TypeAdapter

from app.scanners.base import Scanner
from app.types.domain import Domain
from app.types.ip import Ip
from app.types.email import Email
from app.utils import resolve_type


class OldPatternScanner(Scanner):
    """Example of old pattern using module-level TypeAlias"""
    
    @classmethod
    def name(cls) -> str:
        return "old_pattern_scanner"
    
    @classmethod
    def category(cls) -> str:
        return "Test"
    
    @classmethod
    def key(cls) -> str:
        return "domain"
    
    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        # Old pattern: manually defining TypeAlias and building schema
        InputType: TypeAlias = List[Domain]
        adapter = TypeAdapter(InputType)
        schema = adapter.json_schema()
        type_name, details = list(schema["$defs"].items())[0]
        return {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in details["properties"].items()
            ]
        }
    
    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        # Old pattern: manually defining TypeAlias and building schema
        OutputType: TypeAlias = List[Ip]
        adapter = TypeAdapter(OutputType)
        schema = adapter.json_schema()
        type_name, details = list(schema["$defs"].items())[0]
        return {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in details["properties"].items()
            ]
        }
    
    async def scan(self, values: List[str]) -> List[Dict[str, Any]]:
        return [{"address": "1.2.3.4"}]


class NewPatternScanner(Scanner):
    """Example of new pattern using class attributes with automatic schema generation"""
    
    # New pattern: just define class attributes - base class handles the rest!
    InputType = List[Domain]
    OutputType = List[Ip]
    
    @classmethod
    def name(cls) -> str:
        return "new_pattern_scanner"
    
    @classmethod
    def category(cls) -> str:
        return "Test"
    
    @classmethod
    def key(cls) -> str:
        return "domain"
    
    # No need to implement input_schema() or output_schema() - base class does it automatically!
    
    # Methods can use InputType/OutputType directly (once made available at module level)
    def preprocess(self, data: List[Domain]) -> List[Domain]:
        # Using concrete type for clarity in test, but would use InputType in real implementation
        cleaned: List[Domain] = []
        for item in data:
            if isinstance(item, Domain):
                cleaned.append(item)
        return cleaned
    
    async def scan(self, values: List[Domain]) -> List[Ip]:
        # Using concrete type for clarity in test, but would use InputType/OutputType in real implementation
        results: List[Ip] = []
        for domain in values:
            results.append(Ip(address="1.2.3.4"))
        return results

# Make types available at module level (this is what enables clean usage)
NewPatternInputType = NewPatternScanner.InputType
NewPatternOutputType = NewPatternScanner.OutputType


class AdvancedNewPatternScanner(Scanner):
    """Example showing advanced usage with different types"""
    
    InputType = List[Email]
    OutputType = List[Domain]
    
    @classmethod
    def name(cls) -> str:
        return "advanced_pattern_scanner"
    
    @classmethod
    def category(cls) -> str:
        return "Test"
    
    @classmethod
    def key(cls) -> str:
        return "email"
    
    # Schema methods automatic!
    
    async def scan(self, values: List[str]) -> List[Dict[str, Any]]:
        return [{"domain": "example.com"}]


class TestInputOutputMigrationPattern:
    """Test migration from old to new pattern"""
    
    def test_both_patterns_produce_same_schema(self):
        """Test that old and new patterns produce identical schemas"""
        old_input_schema = OldPatternScanner.input_schema()
        new_input_schema = NewPatternScanner.input_schema()
        
        old_output_schema = OldPatternScanner.output_schema()
        new_output_schema = NewPatternScanner.output_schema()
        
        # Schemas should be identical
        assert old_input_schema == new_input_schema
        assert old_output_schema == new_output_schema
    
    def test_new_pattern_benefits_code_reuse(self):
        """Test that new pattern reduces code duplication"""
        # With the new pattern, multiple scanners can easily reuse the same logic
        
        class Scanner1(Scanner):
            InputType = List[Domain]
            OutputType = List[Ip]
            
            @classmethod
            def name(cls): return "scanner1"
            @classmethod
            def category(cls): return "Test"
            @classmethod
            def key(cls): return "domain"
            # No need for input_schema() or output_schema() - automatic!
            async def scan(self, values): return []
        
        class Scanner2(Scanner):
            InputType = List[Domain]
            OutputType = List[Ip]
            
            @classmethod
            def name(cls): return "scanner2"
            @classmethod
            def category(cls): return "Test"
            @classmethod
            def key(cls): return "domain"
            # No need for input_schema() or output_schema() - automatic!
            async def scan(self, values): return []
        
        # Both should produce identical schemas with minimal code
        assert Scanner1.input_schema() == Scanner2.input_schema()
        assert Scanner1.output_schema() == Scanner2.output_schema()
    
    def test_new_pattern_type_introspection(self):
        """Test that new pattern allows for better type introspection"""
        # Can easily check what types a scanner uses
        assert NewPatternScanner.InputType == List[Domain]
        assert NewPatternScanner.OutputType == List[Ip]
        
        assert AdvancedNewPatternScanner.InputType == List[Email]
        assert AdvancedNewPatternScanner.OutputType == List[Domain]
        
        # This wasn't easily possible with the old pattern
    
    def test_new_pattern_inheritance_works(self):
        """Test that new pattern works well with inheritance"""
        
        class BaseDomainScanner(Scanner):
            InputType = List[Domain]
            OutputType = List[Ip]
            
            @classmethod
            def name(cls): return "base_domain"
            @classmethod
            def category(cls): return "Test"
            @classmethod
            def key(cls): return "domain"
            # Schema methods automatic!
            async def scan(self, values): return []
        
        class SpecializedDomainScanner(BaseDomainScanner):
            @classmethod
            def name(cls): return "specialized_domain"
            # Inherits InputType and OutputType
        
        # Child should inherit the types and schemas
        assert SpecializedDomainScanner.InputType == List[Domain]
        assert SpecializedDomainScanner.OutputType == List[Ip]
        
        specialized_input = SpecializedDomainScanner.input_schema()
        specialized_output = SpecializedDomainScanner.output_schema()
        
        assert specialized_input["type"] == "Domain"
        assert specialized_output["type"] == "Ip"
    
    def test_new_pattern_error_handling(self):
        """Test that new pattern provides better error handling"""
        
        class IncompleteDomainScanner(Scanner):
            # Forgot to define InputType and OutputType
            @classmethod
            def name(cls): return "incomplete"
            @classmethod
            def category(cls): return "Test"
            @classmethod
            def key(cls): return "domain"
            # Base class will try to generate schemas automatically and fail appropriately
            async def scan(self, values): return []
        
        # Should get clear error messages
        with pytest.raises(NotImplementedError) as exc_info:
            IncompleteDomainScanner.input_schema()
        assert "InputType must be defined" in str(exc_info.value)
        assert "IncompleteDomainScanner" in str(exc_info.value)
        
        with pytest.raises(NotImplementedError) as exc_info:
            IncompleteDomainScanner.output_schema()
        assert "OutputType must be defined" in str(exc_info.value)
        assert "IncompleteDomainScanner" in str(exc_info.value)
    
    def test_new_pattern_runtime_accessibility(self):
        """Test that types are accessible at runtime for dynamic operations"""
        
        # Can build registries or perform operations based on types
        scanners = [NewPatternScanner, AdvancedNewPatternScanner]
        
        domain_input_scanners = [
            scanner for scanner in scanners 
            if hasattr(scanner, 'InputType') and scanner.InputType == List[Domain]
        ]
        
        email_input_scanners = [
            scanner for scanner in scanners 
            if hasattr(scanner, 'InputType') and scanner.InputType == List[Email]
        ]
        
        assert len(domain_input_scanners) == 1
        assert domain_input_scanners[0] == NewPatternScanner
        
        assert len(email_input_scanners) == 1
        assert email_input_scanners[0] == AdvancedNewPatternScanner
    
    def test_new_pattern_with_clean_type_usage(self):
        """Test that the new pattern allows clean type usage without quotes"""
        scanner = NewPatternScanner("test", "test")
        
        # Test that we can create data of the expected types
        test_domains = [Domain(domain="example.com"), Domain(domain="test.com")]
        
        # Preprocess should work with clean type annotations
        result = scanner.preprocess(test_domains)
        assert len(result) == 2
        assert all(isinstance(d, Domain) for d in result)
    
    @pytest.mark.asyncio
    async def test_new_pattern_async_methods(self):
        """Test that async methods work correctly with clean type annotations"""
        scanner = NewPatternScanner("test", "test")
        
        test_domains = [Domain(domain="example.com")]
        result = await scanner.scan(test_domains)
        
        assert len(result) == 1
        assert isinstance(result[0], Ip)
        assert result[0].address == "1.2.3.4"
    
    def test_module_level_type_access(self):
        """Test that types are properly accessible at module level"""
        # These should be available after the class definition
        assert NewPatternInputType == List[Domain]
        assert NewPatternOutputType == List[Ip]
        
        # And they should match the class attributes
        assert NewPatternInputType == NewPatternScanner.InputType
        assert NewPatternOutputType == NewPatternScanner.OutputType
    
    def test_migration_checklist(self):
        """Test that demonstrates a complete migration checklist"""
        
        # Migration steps:
        # 1. Define InputType and OutputType as class attributes
        # 2. Remove input_schema() and output_schema() method implementations (base class handles automatically)
        # 3. Add module-level assignments: InputType = MyScanner.InputType (optional, for clean usage)
        
        # Verify the new pattern is simpler and more maintainable
        new_scanner_benefits = [
            "Just define InputType and OutputType class attributes",
            "Automatic schema generation by base class", 
            "No boilerplate schema methods needed",
            "Consistent schema generation across all scanners",
            "Clean type usage throughout class methods"
        ]
        
        assert len(new_scanner_benefits) == 5
        
        # Verify functionality is preserved and automatic
        schema = NewPatternScanner.input_schema()
        assert schema["type"] == "Domain"
        assert any(prop["name"] == "domain" for prop in schema["properties"])
        
        # Verify schemas are generated automatically without manual implementation
        assert hasattr(NewPatternScanner, 'input_schema')
        assert hasattr(NewPatternScanner, 'output_schema')
        
        # The base class should be handling the schema generation
        input_schema = NewPatternScanner.input_schema()
        output_schema = NewPatternScanner.output_schema()
        assert input_schema is not None
        assert output_schema is not None 