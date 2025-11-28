"""
This module provides an automatic type registration system using decorators.
All FlowsintType subclasses can be decorated with @flowsint_type to automatically
register themselves in the global TYPE_REGISTRY.
"""

from typing import Dict, Type, TypeVar, Optional
from pydantic import BaseModel


T = TypeVar("T", bound=BaseModel)


class TypeRegistry:
    """
    Global registry for Flowsint types.

    Stores mappings:
    - Class name (e.g., "Domain") -> Class
    - Lowercase name (e.g., "domain") -> Class (for Neo4j compatibility)
    """

    def __init__(self):
        self._types: Dict[str, Type[BaseModel]] = {}
        self._lowercase_types: Dict[str, Type[BaseModel]] = {}

    def register(self, cls: Type[T]) -> Type[T]:
        """
        Register a type in the registry.

        Args:
            cls: The class to register

        Returns:
            The same class (for use as a decorator)
        """
        class_name = cls.__name__

        # Register with exact class name
        self._types[class_name] = cls

        # Register with lowercase name for Neo4j compatibility
        lowercase_name = class_name.lower()
        self._lowercase_types[lowercase_name] = cls

        return cls

    def get(self, type_name: str) -> Optional[Type[BaseModel]]:
        """
        Get a type by its name (case-sensitive).

        Args:
            type_name: The type name (e.g., "Domain", "Ip")

        Returns:
            The corresponding class, or None if not found
        """
        return self._types.get(type_name)

    def get_lowercase(self, type_name: str) -> Optional[Type[BaseModel]]:
        """
        Get a type by its lowercase name (for Neo4j compatibility).

        Args:
            type_name: The type name in lowercase (e.g., "domain", "ip")

        Returns:
            The corresponding class, or None if not found
        """
        return self._lowercase_types.get(type_name.lower())

    def all_types(self) -> Dict[str, Type[BaseModel]]:
        """
        Get all registered types.

        Returns:
            Dictionary mapping class names to classes
        """
        return self._types.copy()

    def all_types_lowercase(self) -> Dict[str, Type[BaseModel]]:
        """
        Get all registered types with lowercase keys.

        Returns:
            Dictionary mapping lowercase names to classes
        """
        return self._lowercase_types.copy()

    def clear(self):
        """Clear all registered types (mainly for testing)."""
        self._types.clear()
        self._lowercase_types.clear()


# Global type registry instance
TYPE_REGISTRY = TypeRegistry()


def flowsint_type(cls: Type[T]) -> Type[T]:
    """
    Decorator to automatically register a FlowsintType subclass.

    Usage:
        @flowsint_type
        class Domain(FlowsintType):
            domain: str
            ...

    This will automatically register the type in TYPE_REGISTRY with:
    - Key "Domain" -> Domain class
    - Key "domain" -> Domain class (lowercase for Neo4j)

    Args:
        cls: The class to register

    Returns:
        The same class (unmodified)
    """
    return TYPE_REGISTRY.register(cls)


def get_type(type_name: str, case_sensitive: bool = False) -> Optional[Type[BaseModel]]:
    """
    Convenience function to get a type from the global registry.

    Args:
        type_name: The type name to look up
        case_sensitive: If True, use exact case; if False, use lowercase lookup

    Returns:
        The corresponding class, or None if not found
    """
    if case_sensitive:
        return TYPE_REGISTRY.get(type_name)
    else:
        return TYPE_REGISTRY.get_lowercase(type_name)
