"""
Graph service for high-level graph operations.

This module provides a service layer for graph operations,
integrating repository and logging functionality.
"""

from typing import Any, Dict, Optional, Protocol, Union
from uuid import UUID

from pydantic import BaseModel

from .graph_db import Neo4jConnection
from .graph_repository import GraphRepository


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
    """

    def __init__(
        self,
        sketch_id: str,
        neo4j_connection: Optional[Neo4jConnection] = None,
        logger: Optional[LoggerProtocol] = None,
        enable_batching: bool = True,
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

    def create_node(self, node_obj: BaseModel, **properties: Any) -> None:
        """
        Create or update a node in the graph.

        Supports one signatures:
         - Pydantic object: create_node(obj, **overrides)

        Args:
            from_obj: a Pydantic object
            **properties: Additional node properties or overrides
        """
        if self._enable_batching:
            self._repository.add_to_batch(
                "node",
                node_obj=node_obj,
                sketch_id=self._sketch_id,
                **properties,
            )
        else:
            self._repository.create_node(
                node_obj=node_obj,
                sketch_id=self._sketch_id,
                **properties,
            )

    def create_relationship(
        self,
        from_obj: BaseModel,
        to_obj: BaseModel,
        rel_label: Optional[str] = None,
        **properties: Any,
    ) -> None:
        """
        Create a relationship between two nodes.

        Supports 1 signature:
         - Pydantic objects: create_relationship(obj1, obj2, "REL_TYPE")

        Args:
            from_obj: Either a Pydantic object (source)
            to_obj: Either a Pydantic object (target)
            rel_label: Relationship label (ex: "IS_CONNECTED_TO")
            **properties: Additional relationship properties
        """
        if self._enable_batching:
            self._repository.add_to_batch(
                "relationship",
                from_obj=from_obj,
                to_obj=to_obj,
                rel_label=rel_label,
                sketch_id=self._sketch_id,
                **properties,
            )
        else:
            self._repository.create_relationship(
                from_obj=from_obj,
                to_obj=to_obj,
                rel_label=rel_label,
                sketch_id=self._sketch_id,
                **properties,
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
    enable_batching: bool = True,
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
        enable_batching=enable_batching,
    )
