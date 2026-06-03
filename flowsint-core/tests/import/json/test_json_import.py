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


# Valid JSON whose string values contain apostrophes (very common in OSINT
# data, e.g. surnames like "O'Brien"). This is well-formed JSON and must import.
json_with_apostrophe = b"""{
  "nodes": [
    {"id": "1", "label": "Sarah O'Brien", "type": "individual"},
    {"id": "2", "label": "Bob", "type": "individual"}
  ],
  "edges": [
    {"source": "1", "target": "2", "label": "KNOWS"}
  ]
}"""


def test_json_import_preserves_apostrophes_in_string_values():
    """Valid JSON with an apostrophe in a value must parse and keep the value.

    Regression: the parser used to blindly replace every single quote with a
    double quote, which corrupted valid JSON (turning "Sarah O'Brien" into
    "Sarah O"Brien") and raised "Invalid JSON".
    """
    results = parse_json(json_with_apostrophe, max_preview_rows=100)

    assert "Individual" in results.entities
    labels = {
        str(preview.obj.nodeLabel)
        for preview in results.entities["Individual"].results
    }
    assert "Sarah O'Brien" in labels


def test_json_import_still_accepts_single_quoted_payload():
    """Python-dict-style payloads (single-quoted) remain supported as fallback."""
    single_quoted = b"{'nodes': [{'id': '1', 'label': 'Alice', 'type': 'individual'}], 'edges': []}"
    results = parse_json(single_quoted, max_preview_rows=100)
    assert "Individual" in results.entities
