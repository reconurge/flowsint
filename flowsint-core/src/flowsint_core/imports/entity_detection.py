"""
Entity type detection utilities for import feature.
Provides basic pattern matching for common entity types.
"""

from typing import Optional, Type

from flowsint_types import TYPE_REGISTRY, FlowsintType


def detect_type(value: str) -> Optional[Type[FlowsintType]]:
    for model in TYPE_REGISTRY.all_types().values():
        if hasattr(model, "detect") and model.detect(value):
            return model
    return None
