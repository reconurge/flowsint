"""
Graph service for high-level graph operations.

This module provides a service layer for graph operations,
integrating repository and logging functionality.
"""

from typing import Dict, Any, Optional, Protocol
from uuid import UUID
from .graph_repository import GraphRepository
from .graph_db import Neo4jConnection


class LoggerProtocol(Protocol):
    """Protocol for logger implementations."""

    @staticmethod
    def graph_append(sketch_id: str, message: Dict[str, Any]) -> None:
        """Log a graph append message."""
        ...


class GraphService:
    """
    High-level service for graph operations.

    This service provides a clean interface for transform operations,
    handling both graph persistence and logging with proper separation of concerns.
    """

    def __init__(
        self,
        sketch_id: str,
        neo4j_connection: Optional[Neo4jConnection] = None,
        logger: Optional[LoggerProtocol] = None,
        enable_batching: bool = True
    ):
        """
        Initialize the graph service.

        Args:
            sketch_id: Investigation sketch ID
            neo4j_connection: Optional Neo4j connection
            logger: Optional logger instance
            enable_batching: Enable batch operations
        """
        self._sketch_id = sketch_id
        self._repository = GraphRepository(neo4j_connection)
        self._logger = logger
        self._enable_batching = enable_batching

    @property
    def sketch_id(self) -> str:
        """Get the sketch ID."""
        return self._sketch_id

    @property
    def repository(self) -> GraphRepository:
        """Get the underlying repository."""
        return self._repository

    def create_node(
        self,
        node_type: str,
        key_prop: str,
        key_value: str,
        **properties: Any
    ) -> None:
        """
        Create or update a node in the graph.

        Automatically adds the following properties:
        - type: Lowercase version of node_type
        - sketch_id: Current sketch ID
        - label: Defaults to key_value if not provided
        - created_at: ISO 8601 UTC timestamp (only on creation via ON CREATE SET)

        Args:
            node_type: Node label (e.g., "domain", "ip")
            key_prop: Property name used as unique identifier
            key_value: Value of the key property
            **properties: Additional node properties
        """
        if self._enable_batching:
            self._repository.add_to_batch(
                "node",
                node_type=node_type,
                key_prop=key_prop,
                key_value=key_value,
                sketch_id=self._sketch_id,
                **properties
            )
        else:
            self._repository.create_node(
                node_type=node_type,
                key_prop=key_prop,
                key_value=key_value,
                sketch_id=self._sketch_id,
                **properties
            )

    def create_relationship(
        self,
        from_type: str,
        from_key: str,
        from_value: str,
        to_type: str,
        to_key: str,
        to_value: str,
        rel_type: str,
        **properties: Any
    ) -> None:
        """
        Create a relationship between two nodes.

        Args:
            from_type: Source node label
            from_key: Source node key property
            from_value: Source node key value
            to_type: Target node label
            to_key: Target node key property
            to_value: Target node key value
            rel_type: Relationship type
            **properties: Additional relationship properties
        """
        if self._enable_batching:
            self._repository.add_to_batch(
                "relationship",
                from_type=from_type,
                from_key=from_key,
                from_value=from_value,
                to_type=to_type,
                to_key=to_key,
                to_value=to_value,
                rel_type=rel_type,
                sketch_id=self._sketch_id,
                **properties
            )
        else:
            self._repository.create_relationship(
                from_type=from_type,
                from_key=from_key,
                from_value=from_value,
                to_type=to_type,
                to_key=to_key,
                to_value=to_value,
                rel_type=rel_type,
                sketch_id=self._sketch_id,
                **properties
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
    neo4j_connection: Optional[Neo4jConnection] = None,
    enable_batching: bool = True
) -> GraphService:
    """
    Factory function to create a GraphService instance.

    Args:
        sketch_id: Investigation sketch ID
        neo4j_connection: Optional Neo4j connection
        enable_batching: Enable batch operations

    Returns:
        Configured GraphService instance
    """
    # Import Logger here to avoid circular imports
    from .logger import Logger

    return GraphService(
        sketch_id=sketch_id,
        neo4j_connection=neo4j_connection,
        logger=Logger,
        enable_batching=enable_batching
    )
