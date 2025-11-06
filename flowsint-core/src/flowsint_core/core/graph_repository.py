"""
Graph database repository for Neo4j operations.

This module provides a repository pattern implementation for Neo4j,
handling node and relationship operations with batching support.
"""

from typing import Dict, Any, List, Optional, Tuple
from .graph_db import Neo4jConnection
from .graph_serializer import GraphSerializer


class GraphRepository:
    """
    Repository for Neo4j graph database operations.

    This class follows the Repository pattern, providing a clean abstraction
    over Neo4j operations and handling batching for improved performance.
    """

    def __init__(self, neo4j_connection: Optional[Neo4jConnection] = None):
        """
        Initialize the graph repository.

        Args:
            neo4j_connection: Optional Neo4j connection instance.
                             If None, uses the singleton instance.
        """
        self._connection = neo4j_connection or Neo4jConnection.get_instance()
        self._batch_operations: List[Tuple[str, Dict[str, Any]]] = []
        self._batch_size = 100

    def create_node(
        self,
        node_type: str,
        key_prop: str,
        key_value: str,
        sketch_id: str,
        **properties: Any
    ) -> None:
        """
        Create or update a single node in Neo4j.

        Args:
            node_type: Node label (e.g., "domain", "ip")
            key_prop: Property name used as unique identifier
            key_value: Value of the key property
            sketch_id: Investigation sketch ID
            **properties: Additional node properties
        """
        if not self._connection:
            return

        # Serialize properties
        serialized_props = GraphSerializer.serialize_properties(properties)

        # Add required properties
        serialized_props["type"] = node_type.lower()
        serialized_props["sketch_id"] = sketch_id
        serialized_props["label"] = serialized_props.get("label", key_value)

        # Build SET clauses
        set_clauses = [f"n.{prop} = ${prop}" for prop in serialized_props.keys()]
        params = {key_prop: key_value, **serialized_props}

        # Build and execute query
        query = f"""
        MERGE (n:{node_type} {{{key_prop}: ${key_prop}}})
        SET {', '.join(set_clauses)}
        """

        self._connection.execute_write(query, params)

    def create_relationship(
        self,
        from_type: str,
        from_key: str,
        from_value: str,
        to_type: str,
        to_key: str,
        to_value: str,
        rel_type: str,
        sketch_id: str,
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
            sketch_id: Investigation sketch ID
            **properties: Additional relationship properties
        """
        if not self._connection:
            return

        # Serialize relationship properties
        serialized_props = GraphSerializer.serialize_properties(properties)
        serialized_props["sketch_id"] = sketch_id

        # Build relationship properties string
        if serialized_props:
            props_str = ", ".join([f"{k}: ${k}" for k in serialized_props.keys()])
            rel_props = f"{{{props_str}}}"
        else:
            rel_props = "{sketch_id: $sketch_id}"

        query = f"""
        MATCH (from:{from_type} {{{from_key}: $from_value}})
        MATCH (to:{to_type} {{{to_key}: $to_value}})
        MERGE (from)-[:{rel_type} {rel_props}]->(to)
        """

        params = {
            "from_value": from_value,
            "to_value": to_value,
            **serialized_props
        }

        self._connection.execute_write(query, params)

    def add_to_batch(
        self,
        operation_type: str,
        **kwargs: Any
    ) -> None:
        """
        Add an operation to the batch queue.

        Args:
            operation_type: Type of operation ("node" or "relationship")
            **kwargs: Operation parameters
        """
        if operation_type == "node":
            query, params = self._build_node_query(**kwargs)
        elif operation_type == "relationship":
            query, params = self._build_relationship_query(**kwargs)
        else:
            raise ValueError(f"Unknown operation type: {operation_type}")

        self._batch_operations.append((query, params))

        # Auto-flush if batch is full
        if len(self._batch_operations) >= self._batch_size:
            self.flush_batch()

    def _build_node_query(
        self,
        node_type: str,
        key_prop: str,
        key_value: str,
        sketch_id: str,
        **properties: Any
    ) -> Tuple[str, Dict[str, Any]]:
        """Build a node creation query."""
        serialized_props = GraphSerializer.serialize_properties(properties)
        serialized_props["type"] = node_type.lower()
        serialized_props["sketch_id"] = sketch_id
        serialized_props["label"] = serialized_props.get("label", key_value)

        set_clauses = [f"n.{prop} = ${prop}" for prop in serialized_props.keys()]
        params = {key_prop: key_value, **serialized_props}

        query = f"""
        MERGE (n:{node_type} {{{key_prop}: ${key_prop}}})
        SET {', '.join(set_clauses)}
        """

        return query, params

    def _build_relationship_query(
        self,
        from_type: str,
        from_key: str,
        from_value: str,
        to_type: str,
        to_key: str,
        to_value: str,
        rel_type: str,
        sketch_id: str,
        **properties: Any
    ) -> Tuple[str, Dict[str, Any]]:
        """Build a relationship creation query."""
        serialized_props = GraphSerializer.serialize_properties(properties)
        serialized_props["sketch_id"] = sketch_id

        if serialized_props:
            props_str = ", ".join([f"{k}: ${k}" for k in serialized_props.keys()])
            rel_props = f"{{{props_str}}}"
        else:
            rel_props = "{sketch_id: $sketch_id}"

        query = f"""
        MATCH (from:{from_type} {{{from_key}: $from_value}})
        MATCH (to:{to_type} {{{to_key}: $to_value}})
        MERGE (from)-[:{rel_type} {rel_props}]->(to)
        """

        params = {
            "from_value": from_value,
            "to_value": to_value,
            **serialized_props
        }

        return query, params

    def flush_batch(self) -> None:
        """Execute all batched operations in a single transaction."""
        if not self._batch_operations:
            return

        if not self._connection:
            self._batch_operations.clear()
            return

        try:
            self._connection.execute_batch(self._batch_operations)
        finally:
            self._batch_operations.clear()

    def clear_batch(self) -> None:
        """Clear the batch without executing."""
        self._batch_operations.clear()

    def set_batch_size(self, size: int) -> None:
        """
        Set the batch size for auto-flushing.

        Args:
            size: Number of operations to batch before auto-flush
        """
        if size < 1:
            raise ValueError("Batch size must be at least 1")
        self._batch_size = size

    def query(self, cypher: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Execute a custom Cypher query.

        Args:
            cypher: Cypher query string
            parameters: Query parameters

        Returns:
            List of result records
        """
        if not self._connection:
            return []

        return self._connection.query(cypher, parameters)

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - auto-flush batch."""
        if exc_type is None:
            self.flush_batch()
        else:
            self.clear_batch()
