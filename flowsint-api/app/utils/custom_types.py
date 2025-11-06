"""Utilities for handling custom types: validation and dynamic model creation."""
import hashlib
import json
from typing import Any, Dict, Type
from pydantic import BaseModel, create_model, EmailStr, Field, field_validator
from jsonschema import Draft7Validator, ValidationError as JSONSchemaValidationError
from fastapi import HTTPException


# Mapping of JSON Schema types to Python types
TYPE_MAP = {
    "string": str,
    "integer": int,
    "number": float,
    "boolean": bool,
    "object": dict,
    "array": list,
    "null": type(None),
}

# Mapping of JSON Schema formats to Pydantic types
FORMAT_MAP = {
    "email": EmailStr,
    "uri": str,
    "uuid": str,
    "date": str,
    "date-time": str,
}

# Whitelist of allowed JSON Schema types for security
ALLOWED_TYPES = {"string", "integer", "number", "boolean", "object", "array"}


def validate_json_schema(schema: Dict[str, Any]) -> None:
    """
    Validate that a schema is a valid JSON Schema.

    Args:
        schema: The JSON Schema to validate

    Raises:
        HTTPException: If the schema is invalid
    """
    try:
        Draft7Validator.check_schema(schema)
    except JSONSchemaValidationError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON Schema: {e.message}"
        )

    # Additional security checks
    _check_schema_security(schema)


def _check_schema_security(schema: Dict[str, Any]) -> None:
    """
    Check schema for security issues.

    Args:
        schema: The JSON Schema to check

    Raises:
        HTTPException: If security issues are found
    """
    # Check if type is in whitelist
    schema_type = schema.get("type")
    if schema_type and schema_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type '{schema_type}' is not allowed. Allowed types: {ALLOWED_TYPES}"
        )

    # Check properties recursively
    properties = schema.get("properties", {})
    for prop_name, prop_schema in properties.items():
        if isinstance(prop_schema, dict):
            prop_type = prop_schema.get("type")
            if prop_type and prop_type not in ALLOWED_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Type '{prop_type}' in property '{prop_name}' is not allowed"
                )


def validate_payload_against_schema(payload: Dict[str, Any], schema: Dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Validate a payload against a JSON Schema.

    Args:
        payload: The data to validate
        schema: The JSON Schema to validate against

    Returns:
        Tuple of (is_valid, error_messages)
    """
    validator = Draft7Validator(schema)
    errors = list(validator.iter_errors(payload))

    if errors:
        error_messages = [
            f"{'.'.join(str(p) for p in error.path)}: {error.message}"
            for error in errors
        ]
        return False, error_messages

    return True, []


def calculate_schema_checksum(schema: Dict[str, Any]) -> str:
    """
    Calculate a checksum for a schema to detect changes.

    Args:
        schema: The JSON Schema

    Returns:
        SHA256 checksum of the schema
    """
    schema_str = json.dumps(schema, sort_keys=True)
    return hashlib.sha256(schema_str.encode()).hexdigest()


def jsonschema_to_pydantic(schema: Dict[str, Any], model_name: str = "DynamicModel") -> Type[BaseModel]:
    """
    Convert a JSON Schema to a Pydantic model.

    Args:
        schema: The JSON Schema definition
        model_name: Name for the generated Pydantic model

    Returns:
        A dynamically created Pydantic model class

    Raises:
        HTTPException: If conversion fails
    """
    try:
        fields = {}
        properties = schema.get("properties", {})
        required_fields = set(schema.get("required", []))

        for field_name, field_schema in properties.items():
            python_type = _get_python_type(field_schema)

            # Determine if field is required
            if field_name in required_fields:
                default = ...  # Required field
            else:
                default = field_schema.get("default", None)

            # Add field constraints if present
            field_kwargs = {}
            if "description" in field_schema:
                field_kwargs["description"] = field_schema["description"]
            if "minimum" in field_schema:
                field_kwargs["ge"] = field_schema["minimum"]
            if "maximum" in field_schema:
                field_kwargs["le"] = field_schema["maximum"]
            if "minLength" in field_schema:
                field_kwargs["min_length"] = field_schema["minLength"]
            if "maxLength" in field_schema:
                field_kwargs["max_length"] = field_schema["maxLength"]

            if field_kwargs:
                fields[field_name] = (python_type, Field(default, **field_kwargs))
            else:
                fields[field_name] = (python_type, default)

        # Create the dynamic model
        dynamic_model = create_model(model_name, **fields)
        return dynamic_model

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to convert JSON Schema to Pydantic model: {str(e)}"
        )


def _get_python_type(field_schema: Dict[str, Any]) -> Type:
    """
    Get the Python type for a JSON Schema field.

    Args:
        field_schema: The JSON Schema field definition

    Returns:
        The corresponding Python type
    """
    # Handle format first (e.g., email)
    field_format = field_schema.get("format")
    if field_format and field_format in FORMAT_MAP:
        return FORMAT_MAP[field_format]

    # Handle type
    field_type = field_schema.get("type")
    if field_type:
        if isinstance(field_type, list):
            # Handle union types (e.g., ["string", "null"])
            # For simplicity, take the first non-null type
            for t in field_type:
                if t != "null":
                    return TYPE_MAP.get(t, Any)
            return Any
        return TYPE_MAP.get(field_type, Any)

    # Handle anyOf (common in Pydantic-generated schemas)
    if "anyOf" in field_schema:
        any_of = field_schema["anyOf"]
        for option in any_of:
            if option.get("type") != "null":
                return _get_python_type(option)

    return Any
