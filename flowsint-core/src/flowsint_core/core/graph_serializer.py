"""
Graph property serialization utilities.

This module provides utilities for serializing complex Python objects
into Neo4j-compatible primitive types, following the Single Responsibility Principle.
"""

from typing import Any, Dict, List


class GraphSerializer:
    """
    Handles serialization of complex objects to Neo4j-compatible types.

    This class is responsible for converting Pydantic models, nested objects,
    and other complex types into primitive types that can be stored in Neo4j.
    """

    @staticmethod
    def serialize_properties(properties: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert properties to Neo4j-compatible values.

        Handles:
        - Pydantic models (flattened into individual properties)
        - Nested objects (flattened with prefixed keys)
        - Lists (converted to primitive types)
        - Dictionaries (flattened with prefixed keys)
        - None values (converted to empty strings)

        Args:
            properties: Dictionary of properties to serialize

        Returns:
            Dictionary of Neo4j-compatible properties
        """
        serialized = {}

        for key, value in properties.items():
            if value is None:
                serialized[key] = ""
            elif GraphSerializer._is_pydantic_model(value):
                # Flatten Pydantic models
                flattened = GraphSerializer._flatten_pydantic(key, value)
                serialized.update(flattened)
            elif isinstance(value, dict):
                # Flatten dictionaries
                flattened = GraphSerializer._flatten_dict(key, value)
                serialized.update(flattened)
            elif isinstance(value, list):
                # Handle lists
                serialized[key] = GraphSerializer._serialize_list(value)
            elif isinstance(value, (str, int, float, bool)):
                # Keep primitive types as-is
                serialized[key] = "" if value == "None" else value
            else:
                # Convert other complex types to strings
                serialized[key] = str(value) if value != "None" else ""

        return serialized

    @staticmethod
    def _is_pydantic_model(obj: Any) -> bool:
        """Check if an object is a Pydantic model."""
        return (
            hasattr(obj, "__dict__")
            and not isinstance(obj, (str, int, float, bool))
            and (hasattr(obj, "model_dump") or hasattr(obj, "dict"))
        )

    @staticmethod
    def _flatten_pydantic(prefix: str, model: Any) -> Dict[str, Any]:
        """
        Flatten a Pydantic model into individual properties.

        Args:
            prefix: Key prefix for nested properties
            model: Pydantic model instance

        Returns:
            Flattened dictionary
        """
        flattened = {}

        # Try Pydantic v2 first, then v1
        if hasattr(model, "model_dump"):
            data = model.model_dump()
        elif hasattr(model, "dict"):
            data = model.dict()
        else:
            # Fallback to __dict__
            data = model.__dict__

        for nested_key, nested_value in data.items():
            if nested_value is not None:
                new_key = f"{prefix}_{nested_key}"
                if isinstance(nested_value, (str, int, float, bool)):
                    flattened[new_key] = nested_value
                else:
                    # Recursively handle nested complex types
                    flattened[new_key] = str(nested_value)

        return flattened

    @staticmethod
    def _flatten_dict(prefix: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Flatten a dictionary into individual properties.

        Args:
            prefix: Key prefix for nested properties
            data: Dictionary to flatten

        Returns:
            Flattened dictionary
        """
        flattened = {}

        for dict_key, dict_value in data.items():
            if dict_value is not None:
                new_key = f"{prefix}_{dict_key}"
                if isinstance(dict_value, (str, int, float, bool)):
                    flattened[new_key] = dict_value
                else:
                    flattened[new_key] = str(dict_value)

        return flattened

    @staticmethod
    def _serialize_list(items: List[Any]) -> List[Any]:
        """
        Serialize a list to Neo4j-compatible types.

        Args:
            items: List of items to serialize

        Returns:
            List of serialized items
        """
        serialized = []

        for item in items:
            if isinstance(item, (str, int, float, bool)):
                serialized.append(item)
            elif GraphSerializer._is_pydantic_model(item):
                # Convert complex objects to strings
                serialized.append(str(item))
            else:
                serialized.append(str(item))

        return serialized

    @staticmethod
    def normalize_property_value(value: Any) -> Any:
        """
        Normalize a single property value for Neo4j.

        Args:
            value: Value to normalize

        Returns:
            Normalized value
        """
        if value is None:
            return ""
        elif isinstance(value, (str, int, float, bool)):
            return "" if value == "None" else value
        else:
            return str(value)
