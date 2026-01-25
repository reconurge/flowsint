"""
Graph property serialization utilities.

This module provides utilities for serializing complex Python objects
into Neo4j-compatible primitive types, following the Single Responsibility Principle.
"""

from typing import Any, Dict, List

from flowsint_types import TYPE_REGISTRY, FlowsintType
from pydantic import BaseModel

from flowsint_core.utils import flatten, unflatten

from .types import GraphEdge, GraphNode, NodeMetadata


class GraphSerializer:
    """
    Handles serialization of complex objects to Neo4j-compatible types.

    This class is responsible for converting Pydantic models, nested objects,
    and other complex types into primitive types that can be stored in Neo4j.
    """

    @staticmethod
    def _clean_empty_values(data: Dict[str, Any]) -> dict:
        """Remove empty string values from dict to avoid Pydantic validation errors."""
        cleaned = {}
        for key, value in data.items():
            if value == "" or value is None:
                continue
            if isinstance(value, dict):
                cleaned_nested = GraphSerializer._clean_empty_values(value)
                if cleaned_nested:
                    cleaned[key] = cleaned_nested
            elif isinstance(value, list):
                cleaned_list = [
                    GraphSerializer._clean_empty_values(item)
                    if isinstance(item, dict)
                    else item
                    for item in value
                    if item != "" and item is not None
                ]
                if cleaned_list:
                    cleaned[key] = cleaned_list
            else:
                cleaned[key] = value
        return cleaned

    @staticmethod
    def flatten(dict: Dict[str, Any]):
        return flatten(dict, remove_empty=False)

    @staticmethod
    def parse_flowsint_type(entity: Dict, nodeType: str) -> FlowsintType:
        DetectedType = TYPE_REGISTRY.get_lowercase(nodeType)
        if not DetectedType:
            raise ValueError(f"Unknown type: {nodeType}")
        properties = GraphSerializer._clean_empty_values(entity)
        return DetectedType(**properties)

    @staticmethod
    def graph_node_to_flowsint_type(node: GraphNode) -> FlowsintType:
        return node.nodeProperties

    @staticmethod
    def neo4j_dict_to_graph_node(node_dict: Dict[str, Any]) -> GraphNode:
        """Convert a flattened Neo4j node record to a GraphNode instance.

        Unflattens the data, parses the nodeProperties into the appropriate
        FlowsintType subclass, and constructs a complete GraphNode.
        """
        data = node_dict.get("data")
        node_id = str(node_dict.get("id"))
        if not data:
            raise Exception("Could not find node data to extract.")
        # unflatten object from neo4j
        node_dict = unflatten(data)
        node_type = node_dict.get(
            "nodeType", node_dict.get("type", "")
        )  # legacy support type
        nodeLabel = str(node_dict.get("nodeLabel", node_dict.get("label", "")))
        node_properties = node_dict.get("nodeProperties", {})
        node_metadata = node_dict.get("nodeMetadata", {})

        node_properties.pop(
            "nodeLabel", None
        )  # remove nodeLabel from original pydantic

        entity = GraphSerializer.parse_flowsint_type(node_properties, node_type)
        return GraphNode(
            id=node_id,
            nodeLabel=nodeLabel,
            nodeType=node_type,
            nodeColor=node_dict.get("nodeColor"),
            nodeSize=node_dict.get("nodeSize"),
            nodeImage=node_dict.get("nodeImage"),
            nodeIcon=node_dict.get("nodeIcon"),
            nodeFlag=node_dict.get("nodeFlag"),
            nodeShape=node_dict.get("nodeShape"),
            x=node_dict.get("x"),
            y=node_dict.get("y"),
            nodeProperties=entity,
            nodeMetadata=node_metadata,
        )

    @staticmethod
    def flowsint_type_to_neo4j_dict(entity: FlowsintType) -> Dict[str, Any]:
        node_type = entity.__class__.__name__.lower()
        node_label = entity.nodeLabel
        node_shape = (
            "square" if node_type in ["document", "image", "bankaccount"] else "circle"
        )
        graph_node = GraphNode(
            id="",
            nodeColor=None,
            nodeIcon=None,
            nodeImage=None,
            nodeFlag=None,
            nodeShape=node_shape,
            nodeLabel=node_label or "",
            nodeType=node_type,
            nodeProperties=entity,
            nodeMetadata=NodeMetadata(),
        )
        return GraphSerializer.graph_node_to_neo4j_dict(graph_node)

    @staticmethod
    def graph_node_to_neo4j_dict(node: GraphNode) -> Dict[str, Any]:
        """Convert a GraphNode to a flattened Neo4j-compatible dict.

        Serializes the model to JSON-compatible types and flattens nested
        structures into dot-notation keys for Neo4j property storage.
        """
        neo4j_dict = node.model_dump(mode="json", serialize_as_any=True)
        neo4j_dict_flatten = flatten(neo4j_dict, remove_empty=False)
        neo4j_dict_flatten.pop(
            "nodeProperties.nodeLabel", None
        )  # remove nodeLabel from original pydantic
        return neo4j_dict_flatten

    @staticmethod
    def neo4j_dict_to_graph_edge(edge_dict: Dict[str, Any]) -> GraphEdge:
        """Convert a Neo4j relationship record to a GraphEdge instance."""
        return GraphEdge(
            id=str(edge_dict.get("id")),
            source=str(edge_dict.get("source")),
            target=str(edge_dict.get("target")),
            label=str(edge_dict.get("type")),
        )

    @staticmethod
    def graph_edge_to_neo4j_dict(
        from_obj: BaseModel, to_obj: BaseModel, label: str
    ) -> Dict[str, Any]:
        """Build a Neo4j relationship dict for matching nodes by type and label.

        Creates a relationship descriptor that identifies source and target nodes
        by their nodeType and nodeLabel, allowing relationship creation without IDs.
        """
        from_type = (
            from_obj.__class__.__name__.lower()
            if isinstance(from_obj, FlowsintType)
            else from_obj.nodeType
        )
        to_type = (
            to_obj.__class__.__name__.lower()
            if isinstance(to_obj, FlowsintType)
            else to_obj.nodeType
        )
        return {
            "from_type": from_type,
            "from_label": from_obj.nodeLabel,
            "to_type": to_type,
            "to_label": to_obj.nodeLabel,
            "rel_label": label,
        }

    @staticmethod
    def deserialize_nodes(node_dicts: List[Dict[str, Any]]) -> List[GraphNode]:
        """Convert a list of Neo4j node records to GraphNode instances."""
        return [
            GraphSerializer.neo4j_dict_to_graph_node(node_dict)
            for node_dict in node_dicts
        ]

    @staticmethod
    def serialize_nodes(nodes: List[GraphNode]) -> List[Dict[str, Any]]:
        """Convert a list of Neo4j node records to GraphNode instances."""
        return [GraphSerializer.graph_node_to_neo4j_dict(node) for node in nodes]

    @staticmethod
    def serialize_flowsint_types(nodes: List[FlowsintType]) -> List[Dict[str, Any]]:
        """Convert a list of Neo4j node records to GraphNode instances."""
        return [GraphSerializer.flowsint_type_to_neo4j_dict(node) for node in nodes]

    @staticmethod
    def deserialize_edges(edge_dicts: List[Dict[str, Any]]) -> List[GraphEdge]:
        """Convert a list of Neo4j relationship records to GraphEdge instances."""
        return [
            GraphSerializer.neo4j_dict_to_graph_edge(edge_dict)
            for edge_dict in edge_dicts
        ]
