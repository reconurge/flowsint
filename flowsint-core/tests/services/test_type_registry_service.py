"""Tests for TypeRegistryService and dynamic Pydantic model building."""
import pytest
from pydantic import ValidationError

from flowsint_core.core.services.type_registry_service import (
    _build_pydantic_model_from_schema,
)


def test_build_pydantic_model_from_schema_with_number_property():
    schema = {
        "properties": {
            "val": {"type": "number", "title": "Value"},
            "count": {"type": "integer", "title": "Count"},
            "active": {"type": "boolean", "title": "Active"},
        },
        "required": ["val"],
    }

    Model = _build_pydantic_model_from_schema("CustomNumberType", schema)

    # Accepts float for number field
    inst = Model(val=42.5)
    assert inst.val == 42.5
    assert inst.count is None
    assert inst.active is None

    # Accepts numeric input
    inst_with_int = Model(val=10.0, count=5, active=True)
    assert inst_with_int.val == 10.0
    assert inst_with_int.count == 5
    assert inst_with_int.active is True

    # Rejects non-numeric string for number field
    with pytest.raises(ValidationError):
        Model(val="not_a_number")


def test_build_pydantic_model_from_schema_string_and_backward_compatibility():
    schema = {
        "properties": {
            "name": {"type": "string", "title": "Name"},
            "legacy_field": {"title": "Legacy"},  # missing "type" key
        },
        "required": ["name"],
    }

    Model = _build_pydantic_model_from_schema("CustomStringType", schema)

    inst = Model(name="test_value", legacy_field="legacy_val")
    assert inst.name == "test_value"
    assert inst.legacy_field == "legacy_val"

    # Missing required string property raises ValidationError
    with pytest.raises(ValidationError):
        Model(legacy_field="legacy_val")
