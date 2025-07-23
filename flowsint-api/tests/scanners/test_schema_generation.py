"""
Test schema generation for scanners with various InputType and OutputType combinations.
"""
import pytest
from typing import List
from app.scanners.base import Scanner
from app.types.website import Website
from app.types.domain import Domain
from app.types.ip import Ip
from app.scanners.websites.to_domain import WebsiteToDomainScanner
from app.scanners.websites.to_webtrackers import WebsiteToWebtrackersScanner
from app.scanners.websites.to_crawler import WebsiteToCrawler
from app.scanners.domains.to_website import DomainToWebsiteScanner


class TestSchemaGeneration:
    """Test that schema generation correctly identifies InputType and OutputType."""
    
    def test_website_to_domain_scanner_schemas(self):
        """Test that WebsiteToDomainScanner correctly shows Website as input type."""
        scanner = WebsiteToDomainScanner
        
        # Test InputType attribute
        assert scanner.InputType == List[Website]
        
        # Test input schema generation
        input_schema = scanner.input_schema()
        assert input_schema["type"] == "Website", f"Expected 'Website', got '{input_schema['type']}'"
        
        # Test output schema generation  
        output_schema = scanner.output_schema()
        assert output_schema["type"] == "Domain", f"Expected 'Domain', got '{output_schema['type']}'"
    
    def test_website_to_webtrackers_scanner_schemas(self):
        """Test that WebsiteToWebtrackersScanner correctly shows Website as input type."""
        scanner = WebsiteToWebtrackersScanner
        
        # Test InputType attribute
        assert scanner.InputType == List[Website]
        
        # Test input schema generation
        input_schema = scanner.input_schema()
        assert input_schema["type"] == "Website", f"Expected 'Website', got '{input_schema['type']}'"
        
        # Test output schema generation
        output_schema = scanner.output_schema()
        assert output_schema["type"] == "WebTracker", f"Expected 'WebTracker', got '{output_schema['type']}'"
    
    def test_website_to_crawler_scanner_schemas(self):
        """Test that WebsiteToCrawler correctly shows Website as input type."""
        scanner = WebsiteToCrawler
        
        # Test InputType attribute
        assert scanner.InputType == List[Website]
        
        # Test input schema generation
        input_schema = scanner.input_schema()
        assert input_schema["type"] == "Website", f"Expected 'Website', got '{input_schema['type']}'"
    
    def test_domain_to_website_scanner_schemas(self):
        """Test that DomainToWebsiteScanner correctly shows Domain as input and Website as output."""
        scanner = DomainToWebsiteScanner
        
        # Test InputType attribute
        assert scanner.InputType == List[Domain]
        
        # Test input schema generation
        input_schema = scanner.input_schema()
        assert input_schema["type"] == "Domain", f"Expected 'Domain', got '{input_schema['type']}'"
        
        # Test output schema generation
        output_schema = scanner.output_schema()
        assert output_schema["type"] == "Website", f"Expected 'Website', got '{output_schema['type']}'"
    
    def test_all_website_scanners_have_correct_input_types(self):
        """Test that all scanners taking Website input show Website in schema."""
        website_input_scanners = [
            (WebsiteToDomainScanner, "Website", "Domain"),
            (WebsiteToWebtrackersScanner, "Website", "WebTracker"), 
            (WebsiteToCrawler, "Website", None),  # Unknown output type
        ]
        
        for scanner_class, expected_input, expected_output in website_input_scanners:
            input_schema = scanner_class.input_schema()
            assert input_schema["type"] == expected_input, \
                f"{scanner_class.__name__}: Expected input '{expected_input}', got '{input_schema['type']}'"
            
            if expected_output:
                output_schema = scanner_class.output_schema()
                assert output_schema["type"] == expected_output, \
                    f"{scanner_class.__name__}: Expected output '{expected_output}', got '{output_schema['type']}'"

    def test_schema_generation_debug_info(self):
        """Debug test to see what's actually in the schemas."""
        scanner = WebsiteToDomainScanner
        
        # Get the raw TypeAdapter schema
        from pydantic import TypeAdapter
        adapter = TypeAdapter(scanner.InputType)
        raw_schema = adapter.json_schema()
        
        print(f"\n=== Debug Info for {scanner.__name__} ===")
        print(f"InputType: {scanner.InputType}")
        print(f"Raw schema keys: {list(raw_schema.keys())}")
        if "$defs" in raw_schema:
            print(f"$defs keys: {list(raw_schema['$defs'].keys())}")
        print(f"Schema items: {raw_schema.get('items', 'No items')}")
        print(f"Generated input schema: {scanner.input_schema()}")
        
        # This test always passes, it's just for debugging
        assert True
    
    def test_schema_generation_follows_ref_not_first_def(self):
        """
        Regression test for the schema generation bug.
        
        Before the fix: generate_input_schema() picked the first definition in $defs
        (alphabetically "Domain" came before "Website"), so Website scanners incorrectly
        showed "Domain" as their input type.
        
        After the fix: generate_input_schema() follows the $ref in items to get the 
        correct type name.
        """
        scanner = WebsiteToDomainScanner
        
        # Get the raw schema to understand the structure
        from pydantic import TypeAdapter
        adapter = TypeAdapter(scanner.InputType)
        raw_schema = adapter.json_schema()
        
        # Verify the raw schema structure that caused the bug
        assert "$defs" in raw_schema
        assert "Domain" in raw_schema["$defs"]
        assert "Website" in raw_schema["$defs"]
        assert raw_schema["items"]["$ref"] == "#/$defs/Website"
        
        # Before fix: list(raw_schema["$defs"].items())[0][0] would be "Domain" (first alphabetically)
        first_def_name = list(raw_schema["$defs"].items())[0][0]
        assert first_def_name == "Domain"  # This would have been the bug
        
        # After fix: We follow the $ref to get "Website"
        ref_type = raw_schema["items"]["$ref"].split("/")[-1]
        assert ref_type == "Website"  # This is what we should use
        
        # Verify our fix works correctly
        input_schema = scanner.input_schema()
        assert input_schema["type"] == "Website", \
            f"Schema generation should follow $ref, not pick first def. Got '{input_schema['type']}'"