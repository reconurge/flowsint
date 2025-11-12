"""
Graph database repository for Neo4j operations.

This module provides a repository pattern implementation for Neo4j,
handling node and relationship operations with batching support.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
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

        # Build SET clauses (exclude sketch_id as it's in MERGE)
        set_clauses = [f"n.{prop} = ${prop}" for prop in serialized_props.keys() if prop != "sketch_id"]
        params = {
            key_prop: key_value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **serialized_props
        }

        # Build and execute query - MERGE on both key_prop AND sketch_id for uniqueness
        # Use ON CREATE SET to only set created_at when creating, not updating
        query = f"""
        MERGE (n:{node_type} {{{key_prop}: ${key_prop}, sketch_id: $sketch_id}})
        ON CREATE SET n.created_at = $created_at
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

        # MATCH nodes by both key and sketch_id to ensure we're connecting nodes from the same sketch
        query = f"""
        MATCH (from:{from_type} {{{from_key}: $from_value, sketch_id: $sketch_id}})
        MATCH (to:{to_type} {{{to_key}: $to_value, sketch_id: $sketch_id}})
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

        # Build SET clauses (exclude sketch_id as it's in MERGE)
        set_clauses = [f"n.{prop} = ${prop}" for prop in serialized_props.keys() if prop != "sketch_id"]
        params = {
            key_prop: key_value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **serialized_props
        }

        # MERGE on both key_prop AND sketch_id for uniqueness per sketch
        # Use ON CREATE SET to only set created_at when creating, not updating
        query = f"""
        MERGE (n:{node_type} {{{key_prop}: ${key_prop}, sketch_id: $sketch_id}})
        ON CREATE SET n.created_at = $created_at
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

        # MATCH nodes by both key and sketch_id to ensure we're connecting nodes from the same sketch
        query = f"""
        MATCH (from:{from_type} {{{from_key}: $from_value, sketch_id: $sketch_id}})
        MATCH (to:{to_type} {{{to_key}: $to_value, sketch_id: $sketch_id}})
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

    def create_node_from_import(
        self,
        node_type: str,
        label: str,
        sketch_id: str,
        **properties: Any
    ) -> Optional[str]:
        """
        Create a node from import operation (MERGE on sketch_id + label).

        This method is specifically designed for bulk imports where nodes
        are identified by their label within a sketch, rather than by
        a type-specific key property.

        Args:
            node_type: Node label (e.g., "Domain", "Ip")
            label: Human-readable label for the node
            sketch_id: Investigation sketch ID
            **properties: All additional node properties

        Returns:
            Element ID of the created/found node or None
        """
        if not self._connection:
            return None

        # Serialize and prepare all properties
        serialized_props = GraphSerializer.serialize_properties(properties)
        serialized_props["type"] = node_type.lower()
        serialized_props["label"] = label
        serialized_props["caption"] = label
        serialized_props["created_at"] = datetime.now(timezone.utc).isoformat()

        query = f"""
        MERGE (n:`{node_type}` {{sketch_id: $sketch_id, label: $label}})
        ON CREATE SET n += $props
        RETURN elementId(n) as id
        """

        params = {
            "sketch_id": sketch_id,
            "label": label,
            "props": serialized_props
        }

        result = self._connection.query(query, params)
        return result[0]["id"] if result else None

    def update_node(
        self,
        node_type: str,
        key_prop: str,
        key_value: str,
        sketch_id: str,
        **properties: Any
    ) -> Optional[Dict[str, Any]]:
        """
        Update an existing node's properties.

        Args:
            node_type: Node label (e.g., "domain", "ip")
            key_prop: Property name used as unique identifier
            key_value: Value of the key property
            sketch_id: Investigation sketch ID
            **properties: Properties to update

        Returns:
            Updated node properties or None if not found
        """
        if not self._connection:
            return None

        # Serialize properties
        serialized_props = GraphSerializer.serialize_properties(properties)

        # Build SET clauses
        set_clauses = [f"n.{prop} = ${prop}" for prop in serialized_props.keys()]
        params = {key_prop: key_value, "sketch_id": sketch_id, **serialized_props}

        query = f"""
        MATCH (n:{node_type} {{{key_prop}: ${key_prop}, sketch_id: $sketch_id}})
        SET {', '.join(set_clauses)}
        RETURN properties(n) as node
        """

        result = self._connection.query(query, params)
        return result[0]["node"] if result else None

    def delete_nodes(
        self,
        node_ids: List[str],
        sketch_id: str
    ) -> int:
        """
        Delete nodes by their element IDs.

        Args:
            node_ids: List of Neo4j element IDs
            sketch_id: Investigation sketch ID (for safety)

        Returns:
            Number of nodes deleted
        """
        if not self._connection or not node_ids:
            return 0

        query = """
        UNWIND $node_ids AS node_id
        MATCH (n)
        WHERE elementId(n) = node_id AND n.sketch_id = $sketch_id
        DETACH DELETE n
        RETURN count(n) as deleted_count
        """

        result = self._connection.query(
            query,
            {"node_ids": node_ids, "sketch_id": sketch_id}
        )
        return result[0]["deleted_count"] if result else 0

    def delete_all_sketch_nodes(self, sketch_id: str) -> int:
        """
        Delete all nodes and relationships for a sketch.

        Args:
            sketch_id: Investigation sketch ID

        Returns:
            Number of nodes deleted
        """
        if not self._connection:
            return 0

        query = """
        MATCH (n {sketch_id: $sketch_id})
        DETACH DELETE n
        RETURN count(n) as deleted_count
        """

        result = self._connection.query(query, {"sketch_id": sketch_id})
        return result[0]["deleted_count"] if result else 0

    def get_sketch_graph(
        self,
        sketch_id: str,
        limit: int = 100000
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get all nodes and relationships for a sketch.

        Args:
            sketch_id: Investigation sketch ID
            limit: Maximum number of nodes to return

        Returns:
            Dictionary with 'nodes' and 'relationships' lists
        """
        if not self._connection:
            return {"nodes": [], "relationships": []}

        # Get all nodes for the sketch
        nodes_query = """
        MATCH (n)
        WHERE n.sketch_id = $sketch_id
        RETURN elementId(n) as id, labels(n) as labels, properties(n) as data
        LIMIT $limit
        """
        nodes_result = self._connection.query(
            nodes_query,
            {"sketch_id": sketch_id, "limit": limit}
        )

        if not nodes_result:
            return {"nodes": [], "relationships": []}

        node_ids = [record["id"] for record in nodes_result]

        # Get all relationships between these nodes
        rels_query = """
        UNWIND $node_ids AS nid
        MATCH (a)-[r]->(b)
        WHERE elementId(a) = nid AND elementId(b) IN $node_ids
        RETURN elementId(r) as id, type(r) as type, elementId(a) as source,
               elementId(b) as target, properties(r) as data
        """
        rels_result = self._connection.query(
            rels_query,
            {"node_ids": node_ids}
        )

        return {
            "nodes": nodes_result,
            "relationships": rels_result or []
        }

    def create_relationship_by_element_id(
        self,
        from_element_id: str,
        to_element_id: str,
        rel_type: str,
        sketch_id: str,
        **properties: Any
    ) -> Optional[Dict[str, Any]]:
        """
        Create a relationship between two nodes using their element IDs.

        Args:
            from_element_id: Source node element ID
            to_element_id: Target node element ID
            rel_type: Relationship type
            sketch_id: Investigation sketch ID
            **properties: Additional relationship properties

        Returns:
            Created relationship properties or None
        """
        if not self._connection:
            return None

        serialized_props = GraphSerializer.serialize_properties(properties)
        serialized_props["sketch_id"] = sketch_id

        props_str = ", ".join([f"{k}: ${k}" for k in serialized_props.keys()])
        rel_props = f"{{{props_str}}}"

        query = f"""
        MATCH (a) WHERE elementId(a) = $from_id
        MATCH (b) WHERE elementId(b) = $to_id
        MERGE (a)-[r:`{rel_type}` {rel_props}]->(b)
        RETURN properties(r) as rel
        """

        params = {
            "from_id": from_element_id,
            "to_id": to_element_id,
            **serialized_props
        }

        result = self._connection.query(query, params)
        return result[0]["rel"] if result else None

    def update_node_by_element_id(
        self,
        element_id: str,
        sketch_id: str,
        **properties: Any
    ) -> Optional[Dict[str, Any]]:
        """
        Update a node by its element ID.

        Args:
            element_id: Neo4j element ID
            sketch_id: Investigation sketch ID (for safety)
            **properties: Properties to update

        Returns:
            Updated node properties or None if not found
        """
        if not self._connection:
            return None

        serialized_props = GraphSerializer.serialize_properties(properties)
        set_clauses = [f"n.{prop} = ${prop}" for prop in serialized_props.keys()]

        query = f"""
        MATCH (n)
        WHERE elementId(n) = $element_id AND n.sketch_id = $sketch_id
        SET {', '.join(set_clauses)}
        RETURN properties(n) as node
        """

        params = {"element_id": element_id, "sketch_id": sketch_id, **serialized_props}
        result = self._connection.query(query, params)
        return result[0]["node"] if result else None

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
