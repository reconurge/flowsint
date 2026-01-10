"""Comprehensive tests for JSON import functionality."""

from flowsint_core.imports.json.parse_json import parse_json

# Standard JSON graph test data (node-link format)
standard_json = b"""{
  "nodes": [
    {"id": "1", "label": "Alice Dupont", "type": "individual"},
    {"id": "2", "label": "Bob", "type": "individual"},
    {"id": "3", "label": "Charlie", "type": "individual"}
  ],
  "edges": [
    {"source": "1", "target": "2", "label": "KNOWS"},
    {"source": "2", "target": "3", "label": "WORKS_WITH"}
  ]
}"""

# Standard JSON with just ids
standard_json_without_label = b"""{
  "nodes": [
      {"id": "Myriel"},
      {"id": "Napoleon"},
      {"id": "Baptistine"}
  ],
  "edges": [
        {"source": "Napoleon", "target": "Myriel"},
        {"source": "Mlle.Baptistine", "target": "Myriel"},
        {"source": "Napoleon", "target": "Baptistine"}
  ]
}"""
# JSON with properties
json_with_properties = b"""{
  "nodes": [
    {
      "id": "1",
      "label": "example.com",
      "type": "domain",
      "data": {
        "username": "john.doe",
        "domain": "example.com"
      }
    },
    {
      "id": "2",
      "label": "example.com",
      "type": "Domain",
      "data": {
        "tld": "com"
      }
    }
  ],
  "edges": [
    {"source": "1", "target": "2", "label": "BELONGS_TO"}
  ]
}"""


def test_standard_json_import():
    """Test basic standard JSON import."""
    results = parse_json(standard_json, max_preview_rows=100)
    assert "Individual" in results.entities


def test_standard_json_import_without_label():
    """Test basic standard JSON import."""
    results = parse_json(standard_json_without_label, max_preview_rows=100)
    assert "Username" in results.entities
