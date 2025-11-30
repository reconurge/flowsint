"""
This module provides an automatic enricher registration system using decorators.
All Enricher subclasses can be decorated with @flowsint_enricher to automatically
register themselves in the global ENRICHER_REGISTRY.

Auto-discovery is performed by calling load_all_enrichers() which imports all modules
in the flowsint_enrichers package, triggering the @flowsint_enricher decorators.
"""

import inspect
import importlib
import os
import sys
from typing import Dict, Optional, Type, List, Any, TypeVar
from flowsint_core.core.enricher_base import Enricher


E = TypeVar("E", bound=Enricher)


class EnricherRegistry:
    """
    Global registry for Flowsint enrichers.
    Stores mappings: enricher name -> enricher class
    """

    def __init__(self):
        self._enrichers: Dict[str, Type[Enricher]] = {}

    def register(self, enricher_class: Type[E]) -> Type[E]:
        """
        Register an enricher in the registry.
        Args:
            enricher_class: The enricher class to register
        Returns:
            The same class (for use as a decorator)
        """
        self._enrichers[enricher_class.name()] = enricher_class
        return enricher_class

    def enricher_exists(self, name: str) -> bool:
        return name in self._enrichers

    def get_enricher(
        self, name: str, sketch_id: str, scan_id: str, **kwargs
    ) -> Enricher:
        if name not in self._enrichers:
            raise Exception(f"Enricher '{name}' not found")
        return self._enrichers[name](sketch_id=sketch_id, scan_id=scan_id, **kwargs)

    def _create_enricher_metadata(self, enricher: Type[Enricher]) -> Dict[str, str]:
        """Helper method to create enricher metadata dictionary."""
        return {
            "class_name": enricher.__name__,
            "name": enricher.name(),
            "module": enricher.__module__,
            "description": enricher.__doc__,
            "documentation": inspect.cleandoc(enricher.documentation()),
            "category": enricher.category(),
            "inputs": enricher.input_schema(),
            "outputs": enricher.output_schema(),
            "params": {},
            "params_schema": enricher.get_params_schema(),
            "required_params": enricher.required_params(),
            "icon": enricher.icon(),
        }

    def list(
        self, exclude: Optional[List[str]] = None, wobbly_type: Optional[bool] = False
    ) -> List[Dict[str, Any]]:
        if exclude is None:
            exclude = []
        return [
            {
                **self._create_enricher_metadata(enricher),
                "wobblyType": wobbly_type,
            }
            for enricher in self._enrichers.values()
            if enricher.name() not in exclude
        ]

    def list_by_categories(self) -> Dict[str, List[Dict[str, str]]]:
        enrichers_by_category = {}
        for _, enricher in self._enrichers.items():
            category = enricher.category()
            if category not in enrichers_by_category:
                enrichers_by_category[category] = []
            enrichers_by_category[category].append(
                self._create_enricher_metadata(enricher)
            )
        return enrichers_by_category

    def list_by_input_type(
        self, input_type: str, exclude: Optional[List[str]] = []
    ) -> List[Dict[str, str]]:
        input_type_lower = input_type.lower()

        if input_type_lower == "any":
            return [
                self._create_enricher_metadata(enricher)
                for enricher in self._enrichers.values()
                if enricher.name() not in exclude
            ]

        return [
            self._create_enricher_metadata(enricher)
            for enricher in self._enrichers.values()
            if enricher.input_schema()["type"].lower() in ["any", input_type_lower]
            and enricher.name() not in exclude
        ]


# Global enricher registry instance
ENRICHER_REGISTRY = EnricherRegistry()


def flowsint_enricher(cls: Type[E]) -> Type[E]:
    """
    Decorator to automatically register an Enricher subclass.

    Usage:
        @flowsint_enricher
        class SubdomainEnricher(Enricher):
            InputType = Domain
            OutputType = Domain
            ...

    This will automatically register the enricher in ENRICHER_REGISTRY with
    the name returned by enricher_class.name()

    Args:
        cls: The enricher class to register

    Returns:
        The same class (unmodified)
    """
    return ENRICHER_REGISTRY.register(cls)


# Auto-discovery cache
_enrichers_loaded = False


def load_all_enrichers() -> None:
    """
    Automatically discover and import all enricher modules in the flowsint_enrichers package.

    This function uses importlib to dynamically import all Python modules in the
    flowsint_enrichers package (including subdirectories), which triggers the
    @flowsint_enricher decorators and registers all enrichers in ENRICHER_REGISTRY.

    Features:
    - Only imports modules once (cached via _enrichers_loaded flag)
    - Ignores private modules (starting with _)
    - Only imports .py files
    - Recursively scans subdirectories (domain/, ip/, etc.) even without __init__.py
    - Uses os.walk for comprehensive discovery

    This function is idempotent - calling it multiple times is safe and efficient.
    """
    global _enrichers_loaded

    # Early return if already loaded
    if _enrichers_loaded:
        return

    try:
        # Get the flowsint_enrichers package
        import flowsint_enrichers
        package = flowsint_enrichers
    except ImportError:
        # Package not available - skip auto-discovery
        print("Warning: flowsint_enrichers package not found", file=sys.stderr)
        _enrichers_loaded = True
        return

    # Get the root path of the enrichers package
    package_path = package.__path__[0]
    package_name = package.__name__

    # Walk through all directories and files
    for root, dirs, files in os.walk(package_path):
        # Skip __pycache__ directories
        dirs[:] = [d for d in dirs if not d.startswith('__pycache__')]

        # Calculate the module prefix for this directory
        rel_path = os.path.relpath(root, package_path)
        if rel_path == '.':
            module_prefix = package_name
        else:
            # Convert path separators to dots for module names
            module_parts = rel_path.replace(os.sep, '.')
            module_prefix = f"{package_name}.{module_parts}"

        # Import all Python files in this directory
        for filename in files:
            # Skip non-Python files and private files
            if not filename.endswith('.py') or filename.startswith('_'):
                continue

            # Build the full module name
            module_basename = filename[:-3]  # Remove .py extension
            module_name = f"{module_prefix}.{module_basename}"

            # Skip if already imported
            if module_name in sys.modules:
                continue

            # Import the module to trigger @flowsint_enricher decorators
            try:
                importlib.import_module(module_name)
            except Exception as e:
                # Log but don't fail - some modules might have optional dependencies
                print(f"Warning: Failed to import {module_name}: {e}", file=sys.stderr)

    # Mark as loaded
    _enrichers_loaded = True
