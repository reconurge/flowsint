"""
Import service for handling file imports into sketches.

This module provides a service layer for import operations,
handling file parsing, entity conversion, and batch creation.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from flowsint_types import FlowsintType

from flowsint_core.core.graph import GraphSerializer, GraphService
from flowsint_core.core.graph.serializer import TypeResolver


@dataclass
class EntityMapping:
    """Mapping configuration for an entity."""

    id: str
    entity_type: str
    nodeLabel: str
    data: Dict[str, Any]
    include: bool = True
    node_id: Optional[str] = None


@dataclass
class ImportResult:
    """Result of an import execution."""

    status: str
    nodes_created: int
    nodes_skipped: int
    errors: List[str]


class ImportService:
    """
    Service for handling file imports into sketches.

    This service handles:
    - File analysis and parsing
    - Entity conversion to FlowsintTypes
    - Batch node and edge creation
    """

    def __init__(
        self,
        graph_service: GraphService,
        type_resolver: Optional[TypeResolver] = None,
    ):
        """
        Initialize the import service.

        Args:
            graph_service: GraphService instance for database operations
            type_resolver: Optional callable to resolve types by name
        """
        self._graph_service = graph_service
        self._type_resolver = type_resolver or graph_service._type_resolver

    def analyze_file(
        self,
        file_content: bytes,
        filename: str,
        max_preview_rows: int = 10000000,
    ):
        """
        Analyze an uploaded file for import.

        Args:
            file_content: Raw file content as bytes
            filename: Name of the file (used for extension detection)
            max_preview_rows: Maximum number of rows to preview

        Returns:
            FileParseResult with detected entities and edges

        Raises:
            ValueError: If file format is unsupported or parsing fails
        """
        from flowsint_core.imports import parse_import_file

        return parse_import_file(
            file_content=file_content,
            filename=filename,
            max_preview_rows=max_preview_rows,
            type_resolver=self._type_resolver,
        )

    def execute_import(
        self,
        entity_mappings: List[EntityMapping],
        edges: Optional[List[Dict[str, Any]]] = None,
    ) -> ImportResult:
        """
        Execute the import of entities into the sketch.

        Args:
            entity_mappings: List of EntityMapping objects to import
            edges: Optional list of edge definitions with from_id, to_id, label

        Returns:
            ImportResult with status, counts, and any errors
        """
        # Filter only entities marked for inclusion
        entities_to_import = [m for m in entity_mappings if m.include]

        # Convert entity mappings to FlowsintType objects
        conversion_result = self._convert_entities(entities_to_import)
        pydantic_nodes = conversion_result["nodes"]
        nodes_mapping_indices = conversion_result["mapping_indices"]
        conversion_errors = conversion_result["errors"]

        if not pydantic_nodes:
            return ImportResult(
                status="completed_with_errors" if conversion_errors else "completed",
                nodes_created=0,
                nodes_skipped=len(entities_to_import),
                errors=conversion_errors[:50],
            )

        # Batch create nodes
        try:
            nodes = GraphSerializer.serialize_flowsint_types(pydantic_nodes)
            nodes_result = self._graph_service.batch_create_nodes(nodes=nodes)
            nodes_created = nodes_result["nodes_created"]
            node_element_ids = nodes_result.get("node_ids", [])
            batch_errors = nodes_result.get("errors", [])
        except Exception as e:
            return ImportResult(
                status="failed",
                nodes_created=0,
                nodes_skipped=len(entities_to_import),
                errors=[f"Batch node creation failed: {str(e)}"],
            )

        # Create edges if provided
        edge_errors = []
        if edges and nodes_mapping_indices and node_element_ids:
            edge_errors = self._create_edges(
                edges=edges,
                nodes_mapping_indices=nodes_mapping_indices,
                node_element_ids=node_element_ids,
            )

        all_errors = conversion_errors + batch_errors + edge_errors
        nodes_skipped = len(entities_to_import) - nodes_created

        return ImportResult(
            status="completed" if not all_errors else "completed_with_errors",
            nodes_created=nodes_created,
            nodes_skipped=nodes_skipped,
            errors=all_errors[:50],
        )

    def _convert_entities(self, entities: List[EntityMapping]) -> Dict[str, Any]:
        """
        Convert entity mappings to FlowsintType objects.

        Returns:
            Dict with nodes, mapping_indices, and errors
        """
        pydantic_nodes: List[FlowsintType] = []
        nodes_mapping_indices: Dict[str, int] = {}
        errors: List[str] = []

        for idx, mapping in enumerate(entities):
            entity_data = mapping.data.copy()

            try:
                pydantic_obj = GraphSerializer.parse_flowsint_type(
                    entity=entity_data,
                    nodeType=mapping.entity_type,
                    type_resolver=self._type_resolver,
                )
                pydantic_nodes.append(pydantic_obj)

                if mapping.node_id:
                    nodes_mapping_indices[mapping.node_id] = len(pydantic_nodes) - 1

            except ValueError as e:
                errors.append(f"Entity {idx + 1} ({mapping.nodeLabel}): {str(e)}")
            except Exception as e:
                errors.append(f"Entity {idx + 1} ({mapping.nodeLabel}): {str(e)}")

        return {
            "nodes": pydantic_nodes,
            "mapping_indices": nodes_mapping_indices,
            "errors": errors,
        }

    def _create_edges(
        self,
        edges: List[Dict[str, Any]],
        nodes_mapping_indices: Dict[str, int],
        node_element_ids: List[str],
    ) -> List[str]:
        """
        Create edges between imported nodes.

        Returns:
            List of error messages
        """
        errors: List[str] = []
        edges_to_insert: List[Dict[str, Any]] = []

        for idx, edge in enumerate(edges):
            from_id = edge.get("from_id")
            to_id = edge.get("to_id")

            from_idx = nodes_mapping_indices.get(from_id)
            to_idx = nodes_mapping_indices.get(to_id)

            if from_idx is None or to_idx is None:
                errors.append(
                    f"Edge {idx}: Missing source or target node (from: {from_id}, to: {to_id})"
                )
                continue

            if from_idx >= len(node_element_ids) or to_idx >= len(node_element_ids):
                errors.append(f"Edge {idx}: Node index out of range")
                continue

            edges_to_insert.append(
                {
                    "from_element_id": node_element_ids[from_idx],
                    "to_element_id": node_element_ids[to_idx],
                    "rel_label": edge.get("label", "RELATED_TO"),
                }
            )

        if edges_to_insert:
            try:
                edges_result = self._graph_service.batch_create_edges_by_element_id(
                    edges=edges_to_insert
                )
                errors.extend(edges_result.get("errors", []))
            except Exception as e:
                errors.append(f"Batch edge creation failed: {str(e)}")

        return errors


def create_import_service(graph_service: GraphService) -> ImportService:
    """
    Factory function to create an ImportService instance.

    Args:
        graph_service: GraphService instance for database operations

    Returns:
        Configured ImportService instance
    """
    return ImportService(graph_service=graph_service)
