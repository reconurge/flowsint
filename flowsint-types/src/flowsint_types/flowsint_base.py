from pydantic import BaseModel, Field
from pydantic._internal._model_construction import ModelMetaclass
from typing import Optional, Type


class FlowsintTypeMetaclass(ModelMetaclass):
    """
    Metaclass for FlowsintType that automatically registers types in the TYPE_REGISTRY.

    This metaclass ensures that any class that inherits from FlowsintType
    is automatically registered in the global type registry.
    """

    def __new__(mcs, name: str, bases: tuple, namespace: dict, **kwargs):
        # Create the class using Pydantic's metaclass
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)

        # Only register if this is a subclass of FlowsintType (not FlowsintType itself)
        # and if it's not an abstract class
        if name != 'FlowsintType' and bases:
            # Import here to avoid circular dependency
            from .registry import TYPE_REGISTRY
            TYPE_REGISTRY.register(cls)

        return cls


class FlowsintType(BaseModel, metaclass=FlowsintTypeMetaclass):
    """Base class for all Flowsint entity types with label support.
    Label is optional but computed at definition time.

    All classes that inherit from FlowsintType are automatically registered
    in the global TYPE_REGISTRY and can be accessed by their class name.
    """
    label: Optional[str] = Field(
        None, description="UI-readable label for this entity, the one used on the graph.", title="Label"
    )
