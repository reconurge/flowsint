"""
Graph service for high-level graph operations.

This module provides a service layer for graph operations,
integrating repository and logging functionality.
"""

from typing import Any, Dict, List, Optional, Protocol

from flowsint_types import FlowsintType
from pydantic import BaseModel

from .repository import Neo4jGraphRepository
from .repository_protocol import GraphRepositoryProtocol
from .serializer import GraphSerializer, TypeResolver
from .types import GraphData, GraphDict, GraphNode


class LoggerProtocol(Protocol):
    """Protocol for logger implementations."""

    @staticmethod
    def graph_append(sketch_id: str, message: Dict[str, Any]) -> None:
        """Log a graph append message."""
        ...


class GraphService:
    """
    High-level service for graph operations.

    This service provides a clean interface for enricher operations,
    handling both graph persistence and logging with proper separation of concerns.

    This service can support FlowsintType input or GraphNode input.
    """

    def __init__(
        self,
        sketch_id: str,
        repository: GraphRepositoryProtocol,
        logger: Optional[LoggerProtocol] = None,
        enable_batching: bool = False,
        type_resolver: Optional[TypeResolver] = None,
    ):
        """
        Initialize the graph service.

        Args:
            sketch_id: Investigation sketch ID
            repository: Repository instance (required - dependency injection)
            logger: Optional logger instance
            enable_batching: Enable batch operations
            type_resolver: Optional callable to resolve custom types by name

        Raises:
            ValueError: If repository is not provided
        """
        if repository is None:
            raise ValueError(
                "repository is required. Use create_graph_service() factory "
                "or provide a GraphRepositoryProtocol implementation."
            )
        self._sketch_id = sketch_id
        self._repository = repository
        self._logger = logger
        self._enable_batching = enable_batching
        self._type_resolver = type_resolver

    @property
    def sketch_id(self) -> str:
        """Get the sketch ID."""
        return self._sketch_id

    @property
    def repository(self) -> GraphRepositoryProtocol:
        """Get the underlying repository."""
        return self._repository

    def create_node(self, node_obj: GraphNode) -> str | None:
        """
        Create or update a node in the graph.

        Supports one signatures:
         - GraphNode object: create_node(obj)

        Args:
            node_obj: a GraphNode object
        """

        if isinstance(node_obj, FlowsintType):
            raise Exception(
                "create_node method takes a GraphNode as input. If you want to insert a node from a FlowsintType, please use create_node_from_flowsint_type method."
            )

        neo4j_node_dict: GraphDict = GraphSerializer.graph_node_to_neo4j_dict(node_obj)

        if self._enable_batching:
            self._repository.add_to_batch(
                "node",
                node_obj=neo4j_node_dict,
                sketch_id=self._sketch_id,
            )
        else:
            return self._repository.create_node(
                node_obj=neo4j_node_dict,
                sketch_id=self._sketch_id,
            )

    def create_node_from_flowsint_type(self, node_obj: FlowsintType) -> str | None:
        """
        Create or update a node in the graph.

        Supports one signatures:
         - FlowsintType object: create_node(obj)

        Args:
            node_obj: a FlowsintType object
        """

        if isinstance(node_obj, GraphNode):
            raise Exception(
                "create_node_from_flowsint_type method takes a FlowsintType as input. If you want to insert a node from a GraphNode, please use create_node method."
            )

        neo4j_node_dict: GraphDict = GraphSerializer.flowsint_type_to_neo4j_dict(
            node_obj
        )

        if self._enable_batching:
            self._repository.add_to_batch(
                "node",
                node_obj=neo4j_node_dict,
                sketch_id=self._sketch_id,
            )
        else:
            return self._repository.create_node(
                node_obj=neo4j_node_dict,
                sketch_id=self._sketch_id,
            )

    def get_sketch_graph(self) -> GraphData:
        graph_data = self.repository.get_sketch_graph(self.sketch_id)
        nodes = GraphSerializer.deserialize_nodes(
            graph_data.get("nodes", []), type_resolver=self._type_resolver
        )
        edges = GraphSerializer.deserialize_edges(graph_data.get("edges", []))
        return GraphData(nodes=nodes, edges=edges)

    def get_nodes_by_ids(self, node_ids: List[str]) -> List[GraphNode]:
        nodes = self.repository.get_nodes_by_ids(node_ids, self.sketch_id)
        return GraphSerializer.deserialize_nodes(
            nodes, type_resolver=self._type_resolver
        )

    def get_nodes_by_ids_for_task(self, node_ids: List[str]) -> List[BaseModel]:
        nodes = self.get_nodes_by_ids(node_ids)
        return [GraphSerializer.graph_node_to_flowsint_type(node) for node in nodes]

    def create_relationship(
        self,
        from_obj: BaseModel,
        to_obj: BaseModel,
        rel_label: str = "IS_RELATED_TO",
    ) -> None:
        """
        Create a relationship between two nodes.

        Supports 1 signature:
         - Pydantic objects: create_relationship(obj1, obj2, "rel_label")

        Args:
            from_obj: A GraphNode object (source)
            to_obj: A GraphNode object (target)
            rel_label: Relationship label (ex: "IS_CONNECTED_TO")
            **properties: Additional relationship properties
        """

        neo4j_rel_dict: GraphDict = GraphSerializer.graph_edge_to_neo4j_dict(
            from_obj, to_obj, rel_label
        )

        if self._enable_batching:
            self._repository.add_to_batch(
                "relationship",
                rel_obj=neo4j_rel_dict,
                sketch_id=self._sketch_id,
            )
        else:
            self._repository.create_relationship(
                rel_obj=neo4j_rel_dict,
                sketch_id=self._sketch_id,
            )

    def create_relationship_by_element_id(
        self,
        from_element_id: str,
        to_element_id: str,
        rel_label: str = "IS_RELATED_TO",
    ):
        return self._repository.create_relationship_by_element_id(
            from_element_id=from_element_id,
            to_element_id=to_element_id,
            rel_label=rel_label,
            sketch_id=self._sketch_id,
        )

    def get_neighbors(self, node_id: str) -> GraphData:
        graph_data = self._repository.get_neighbors(
            node_id=node_id,
            sketch_id=self._sketch_id,
        )
        nodes = GraphSerializer.deserialize_nodes(
            graph_data.get("nodes", []), type_resolver=self._type_resolver
        )
        edges = GraphSerializer.deserialize_edges(graph_data.get("edges", []))
        return GraphData(nodes=nodes, edges=edges)

    def update_node(self, element_id: str, updates: Dict[str, Any]) -> str | None:
        flatten_updates = GraphSerializer.flatten(updates)
        """Update a node by its element ID."""
        return self._repository.update_node(
            element_id=element_id,
            updates=flatten_updates,
            sketch_id=self._sketch_id,
        )

    def update_nodes_positions(self, positions: List[Dict[str, Any]]) -> int:
        """Update positions (x, y) for multiple nodes in batch."""
        return self._repository.update_nodes_positions(
            positions=positions,
            sketch_id=self._sketch_id,
        )

    def delete_nodes(self, node_ids: List[str]) -> int:
        """Delete nodes by their element IDs."""
        return self._repository.delete_nodes(
            node_ids=node_ids,
            sketch_id=self._sketch_id,
        )

    def delete_relationships(self, relationship_ids: List[str]) -> int:
        """Delete relationships by their element IDs."""
        return self._repository.delete_relationships(
            relationship_ids=relationship_ids,
            sketch_id=self._sketch_id,
        )

    def delete_all_sketch_nodes(self) -> int:
        """Delete all nodes and relationships for the sketch."""
        return self._repository.delete_all_sketch_nodes(
            sketch_id=self._sketch_id,
        )

    def update_relationship(
        self, element_id: str, properties: Dict[str, Any]
    ) -> Dict[str, Any] | None:
        """Update a relationship by its element ID."""
        return self._repository.update_relationship(
            element_id=element_id,
            rel_obj=properties,
            sketch_id=self._sketch_id,
        )

    def merge_nodes(
        self,
        old_node_ids: List[str],
        new_node_data: Dict[str, Any],
        new_node_id: str | None = None,
    ) -> str | None:
        """Merge multiple nodes into one, transferring all relationships."""
        return self._repository.merge_nodes(
            old_node_ids=old_node_ids,
            new_node_data=new_node_data,
            new_node_id=new_node_id,
            sketch_id=self._sketch_id,
        )

    def batch_create_nodes(self, nodes: List[GraphDict]) -> Dict[str, Any]:
        """Create multiple nodes in a single batch transaction."""
        return self._repository.batch_create_nodes(
            nodes=nodes,
            sketch_id=self._sketch_id,
        )

    def batch_create_edges_by_element_id(
        self, edges: List[GraphDict]
    ) -> Dict[str, Any]:
        """Create multiple edges using element IDs in a single batch transaction."""
        return self._repository.batch_create_edges_by_element_id(
            edges=edges,
            sketch_id=self._sketch_id,
        )

    def log_graph_message(self, message: str) -> None:
        """
        Log a graph operation message.

        Args:
            message: Message to log
        """
        if self._logger:
            self._logger.graph_append(self._sketch_id, {"message": message})

    def flush(self) -> None:
        """Flush any pending batch operations."""
        if self._enable_batching:
            self._repository.flush_batch()

    def query(self, cypher: str, parameters: Dict[str, Any] = None) -> list:
        """
        Execute a custom Cypher query.

        Args:
            cypher: Cypher query string
            parameters: Query parameters

        Returns:
            List of result records
        """
        return self._repository.query(cypher, parameters)

    def set_batch_size(self, size: int) -> None:
        """
        Set the batch size for operations.

        Args:
            size: Number of operations to batch
        """
        self._repository.set_batch_size(size)

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - auto-flush batch."""
        if exc_type is None:
            self.flush()


def create_graph_service(
    sketch_id: str,
    enable_batching: bool = True,
    type_resolver: Optional[TypeResolver] = None,
) -> GraphService:
    """
    Factory function to create a GraphService instance with Neo4j repository.

    This is the recommended way to create a GraphService for production use.
    For testing, inject an InMemoryGraphRepository or mock directly into GraphService.

    Args:
        sketch_id: Investigation sketch ID
        enable_batching: Enable batch operations
        type_resolver: Optional callable to resolve custom types by name

    Returns:
        Configured GraphService instance
    """
    # Import Logger here to avoid circular imports
    from flowsint_core.core.logger import Logger

    # Neo4jGraphRepository uses Neo4jConnection.get_instance() singleton
    repository = Neo4jGraphRepository()

    return GraphService(
        sketch_id=sketch_id,
        repository=repository,
        logger=Logger,
        enable_batching=enable_batching,
        type_resolver=type_resolver,
    )
