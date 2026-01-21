"""
Graph database repository for Neo4j operations.

This module provides a repository pattern implementation for Neo4j,
handling raw Neo4jDict object and operations with batching support.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from .connection import Neo4jConnection
from .types import Neo4jDict


class Neo4jGraphRepository:
    """
    Neo4j main implementation of the graph repository.

    This class follows the Repository pattern, providing a clean abstraction
    over Neo4j operations and handling batching for improved performance.

    Implements GraphRepositoryProtocol for dependency injection.
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
        node_obj: Neo4jDict,
        sketch_id: str,
    ) -> Optional[str]:
        """
        Create or update a single node in Neo4j.

        Supported signature:
        1. Neo4jDict object: create_node(obj)

        Args:
            node_obj: a Neo4jDict object
            sketch_id: str

        Returns:
            Element ID of created/updated node
        """
        if not self._connection:
            return None

        query, params = self._build_node_query(node_obj, sketch_id)
        result = self._connection.query(query, params)
        return result[0]["id"] if result else None

    def create_relationship(
        self,
        rel_obj: Neo4jDict,
        sketch_id: str,
    ) -> None:
        """
        Create a relationship between two nodes.

        Supports one signature:
         - Pydantic objects: create_relationship(relation, sketch_id="...")

        Args:
            rel_obj: the Neo4jDict object
            sketch_id: Investigation sketch ID (required)
        """
        if not self._connection:
            return

        query, params = self._build_relationship_query(rel_obj, sketch_id)

        self._connection.execute_write(query, params)

    def add_to_batch(self, operation_type: str, **kwargs: Any) -> None:
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
        self, node_obj: Neo4jDict, sketch_id: str
    ) -> Tuple[str, Dict[str, Any]]:
        node_label = node_obj.get("nodeLabel")
        node_type = node_obj.get("nodeType")

        # paramètres Neo4j
        params = {
            "props": node_obj,  # flat with keys containing "."
            "node_label": node_label,
            "sketch_id": sketch_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        query = f"""
        MERGE (n:{node_type} {{ nodeLabel: $node_label, sketch_id: $sketch_id }})
        ON CREATE SET n.created_at = $created_at
        SET n += $props
        RETURN elementId(n) AS id
        """

        return query, params

    def _build_relationship_query(
        self,
        rel_obj: Neo4jDict,
        sketch_id: str,
    ) -> Tuple[str, Dict[str, Any]]:
        from_type = rel_obj["from_type"]
        from_label = rel_obj["from_label"]
        to_type = rel_obj["to_type"]
        to_label = rel_obj["to_label"]
        rel_label = rel_obj["rel_label"]

        params = {
            "from_label": from_label,
            "to_label": to_label,
            "sketch_id": sketch_id,
            "props": rel_obj,
        }

        query = f"""
        MATCH (from:{from_type} {{nodeLabel: $from_label, sketch_id: $sketch_id}})
        MATCH (to:{to_type} {{nodeLabel: $to_label, sketch_id: $sketch_id}})
        MERGE (from)-[r:{rel_label}]->(to)
        SET r += $props
        """

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

    def batch_create_nodes(
        self,
        nodes: List[Neo4jDict],
        sketch_id: str,
    ) -> Dict[str, Any]:
        """
        Create multiple nodes in a single batch transaction.

        Args:
            nodes: List of Neo4jDict model instances to insert
            sketch_id: investigation sketch id

        Returns:
            Dictionary with:
                - nodes_created: Number of successfully created nodes
                - node_ids: List of created node element IDs
                - errors: List of error messages for failed nodes
        """
        if not self._connection:
            return {
                "nodes_created": 0,
                "node_ids": [],
                "errors": ["No database connection"],
            }

        if not nodes:
            return {"nodes_created": 0, "node_ids": [], "errors": []}

        # Build all queries
        batch_operations = []
        errors = []

        for idx, node_obj in enumerate(nodes):
            try:
                query, params = self._build_node_query(
                    node_obj=node_obj, sketch_id=sketch_id
                )
                batch_operations.append((query, params))
            except Exception as e:
                errors.append(f"Node {idx}: {str(e)}")

        # Execute batch
        if not batch_operations:
            return {"nodes_created": 0, "node_ids": [], "errors": errors}

        try:
            # Execute all operations in a single transaction
            results = self._connection.execute_batch(batch_operations)

            # Extract node IDs from results
            node_ids = []
            if results:
                for result in results:
                    if result and len(result) > 0 and "id" in result[0]:
                        node_ids.append(result[0]["id"])

            return {
                "nodes_created": len(node_ids),
                "node_ids": node_ids,
                "errors": errors,
            }
        except Exception as e:
            errors.append(f"Batch execution failed: {str(e)}")
            return {"nodes_created": 0, "node_ids": [], "errors": errors}

    def batch_create_edges(
        self,
        edges: List[Dict[str, Any]],
        sketch_id: str,
    ) -> Dict[str, Any]:
        """
        Create multiple edges/relationships in a single batch transaction.

        Args:
            edges: List of edge dictionaries, each with:
                - rel_obj: Source node Neo4jDict model

        Returns:
            Dictionary with:
                - edges_created: Number of successfully created edges
                - errors: List of error messages for failed edges
        """
        if not self._connection:
            return {"edges_created": 0, "errors": ["No database connection"]}

        if not edges:
            return {"edges_created": 0, "errors": []}

        # Build all queries
        batch_operations = []
        errors = []

        for idx, edge in enumerate(edges):
            try:
                query, params = self._build_relationship_query(
                    rel_obj=edge, sketch_id=sketch_id
                )
                batch_operations.append((query, params))
            except Exception as e:
                errors.append(f"Edge {idx}: {str(e)}")

        # Execute batch
        if not batch_operations:
            return {"edges_created": 0, "errors": errors}

        try:
            # Execute all operations in a single transaction
            self._connection.execute_batch(batch_operations)

            return {
                "edges_created": len(batch_operations),
                "errors": errors,
            }
        except Exception as e:
            errors.append(f"Batch execution failed: {str(e)}")
            return {"edges_created": 0, "errors": errors}

    def batch_create_edges_by_element_id(
        self,
        edges: List[Neo4jDict],
        sketch_id: str,
    ) -> Neo4jDict:
        """
        Create multiple edges/relationships using element IDs in a single batch transaction.

        This method is more reliable than batch_create_edges when you have the element IDs,
        as it doesn't need to match nodes by their properties.

        Args:
            edges: List of edge dictionaries, each with:
                - from_element_id: Source node element ID
                - to_element_id: Target node element ID
                - rel_label: Relationship type/label
                - properties: Optional dict of relationship properties
            sketch_id: Investigation sketch ID

        Returns:
            Dictionary with:
                - edges_created: Number of successfully created edges
                - errors: List of error messages for failed edges
        """
        if not self._connection:
            return {"edges_created": 0, "errors": ["No database connection"]}

        if not edges:
            return {"edges_created": 0, "errors": []}

        # Build all queries
        batch_operations = []
        errors = []

        for idx, edge in enumerate(edges):
            try:
                from_element_id = edge.get("from_element_id")
                to_element_id = edge.get("to_element_id")
                rel_label = edge.get("rel_label", "RELATED_TO")

                if not from_element_id or not to_element_id:
                    errors.append(
                        f"Edge {idx}: Missing required fields (from_element_id or to_element_id)"
                    )
                    continue

                edge["sketch_id"] = sketch_id

                # Build relationship properties string
                props_str = ", ".join([f"{k}: ${k}_{idx}" for k in edge.keys()])
                rel_props = (
                    f"{{{props_str}}}" if props_str else "{sketch_id: $sketch_id}"
                )

                query = f"""
                MATCH (from) WHERE elementId(from) = $from_id_{idx}
                MATCH (to) WHERE elementId(to) = $to_id_{idx}
                MERGE (from)-[r:`{rel_label}` {rel_props}]->(to)
                """

                # Build params with unique keys for batch execution
                params = {
                    f"from_id_{idx}": from_element_id,
                    f"to_id_{idx}": to_element_id,
                }
                # Add serialized properties with index suffix
                for k, v in edge.items():
                    params[f"{k}_{idx}"] = v

                batch_operations.append((query, params))
            except Exception as e:
                errors.append(f"Edge {idx}: {str(e)}")

        # Execute batch
        if not batch_operations:
            return {"edges_created": 0, "errors": errors}

        try:
            # Execute all operations in a single transaction
            self._connection.execute_batch(batch_operations)

            return {
                "edges_created": len(batch_operations),
                "errors": errors,
            }
        except Exception as e:
            errors.append(f"Batch execution failed: {str(e)}")
            return {"edges_created": 0, "errors": errors}

    def update_node(
        self, element_id: str, updates: Neo4jDict, sketch_id: str
    ) -> Optional[str]:
        if not self._connection:
            return None

        query = """
        MATCH (n)
        WHERE elementId(n) = $element_id AND n.sketch_id = $sketch_id
        SET n += $props
        RETURN elementId(n) AS id
        """

        params = {
            "element_id": element_id,
            "sketch_id": sketch_id,
            "props": updates,
        }

        result = self._connection.query(query, params)
        return result[0]["id"] if result else None

    def delete_nodes(self, node_ids: List[str], sketch_id: str) -> int:
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
            query, {"node_ids": node_ids, "sketch_id": sketch_id}
        )
        return result[0]["deleted_count"] if result else 0

    def delete_relationships(self, relationship_ids: List[str], sketch_id: str) -> int:
        """
        Delete relationships by their element IDs.

        Args:
            relationship_ids: List of Neo4j element IDs
            sketch_id: Investigation sketch ID (for safety)

        Returns:
            Number of relationships deleted
        """
        if not self._connection or not relationship_ids:
            return 0

        query = """
        UNWIND $relationship_ids AS rel_id
        MATCH ()-[r]->()
        WHERE elementId(r) = rel_id AND r.sketch_id = $sketch_id
        DELETE r
        RETURN count(r) as deleted_count
        """

        result = self._connection.query(
            query, {"relationship_ids": relationship_ids, "sketch_id": sketch_id}
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
        OPTIONAL MATCH (n {sketch_id: $sketch_id})
        WHERE n IS NOT NULL
        DETACH DELETE n
        RETURN count(n) as deleted_count
        """

        result = self._connection.query(query, {"sketch_id": sketch_id})
        return result[0]["deleted_count"] if result else 0

    def get_sketch_graph(
        self, sketch_id: str, limit: int = 100000
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get all nodes and edges for a sketch.

        Args:
            sketch_id: Investigation sketch ID
            limit: Maximum number of nodes to return

        Returns:
            Dictionary with 'nodes' and 'edges' lists
        """
        if not self._connection:
            return {"nodes": [], "edges": []}

        # Get all nodes for the sketch
        # Use OPTIONAL MATCH to avoid Neo4j warning when sketch_id property doesn't exist yet
        nodes_query = """
        OPTIONAL MATCH (n)
        WHERE n.sketch_id = $sketch_id
        WITH n
        WHERE n IS NOT NULL
        RETURN elementId(n) as id, labels(n) as labels, properties(n) as data
        LIMIT $limit
        """
        nodes_result = self._connection.query(
            nodes_query, {"sketch_id": sketch_id, "limit": limit}
        )

        if not nodes_result:
            return {"nodes": [], "edges": []}

        node_ids = [record["id"] for record in nodes_result]
        # Get all edges between these nodes
        rels_query = """
        UNWIND $node_ids AS nid
        MATCH (a)-[r]->(b)
        WHERE elementId(a) = nid AND elementId(b) IN $node_ids
        RETURN elementId(r) as id, type(r) as type, elementId(a) as source,
               elementId(b) as target, properties(r) as data
        """
        rels_result = self._connection.query(rels_query, {"node_ids": node_ids})
        return {"nodes": nodes_result, "edges": rels_result or []}

    def update_relationship(
        self, element_id: str, rel_obj: Neo4jDict, sketch_id: str
    ) -> Optional[Dict[str, Any]]:
        if not self._connection:
            return None

        query = """
        MATCH ()-[r]->()
        WHERE elementId(r) = $element_id AND r.sketch_id = $sketch_id
        SET r += $props
        RETURN
            elementId(r) AS id,
            type(r) AS type,
            properties(r) AS data
        """

        params = {
            "element_id": element_id,
            "sketch_id": sketch_id,
            "props": rel_obj,
        }

        result = self._connection.query(query, params)
        return result[0] if result else None

    def create_relationship_by_element_id(
        self,
        from_element_id: str,
        to_element_id: str,
        rel_label: str,
        sketch_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Create a relationship between two nodes using their element IDs.

        Args:
            from_element_id: Source node element ID
            to_element_id: Target node element ID
            rel_label: Relationship type
            sketch_id: Investigation sketch ID

        Returns:
            Created relationship properties or None
        """
        if not self._connection:
            return None
        serialized_props = {}
        serialized_props["sketch_id"] = sketch_id

        props_str = ", ".join([f"{k}: ${k}" for k in serialized_props.keys()])
        rel_props = f"{{{props_str}}}"

        query = f"""
        MATCH (a) WHERE elementId(a) = $from_id
        MATCH (b) WHERE elementId(b) = $to_id
        MERGE (a)-[r:`{rel_label}` {rel_props}]->(b)
        RETURN properties(r) as rel
        """

        params = {
            "from_id": from_element_id,
            "to_id": to_element_id,
            "sketch_id": sketch_id,
        }

        result = self._connection.query(query, params)
        return result[0]["rel"] if result else None

    def query(
        self, cypher: str, parameters: Dict[str, Any] = {}
    ) -> List[Dict[str, Any]]:
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

    def update_nodes_positions(
        self, positions: List[Dict[str, Any]], sketch_id: str
    ) -> int:
        """
        Update positions (x, y) for multiple nodes in batch.

        Args:
            positions: List of dicts with keys 'nodeId', 'x', 'y'
            sketch_id: Investigation sketch ID (for safety)

        Returns:
            Number of nodes updated
        """
        if not self._connection or not positions:
            return 0

        query = """
        UNWIND $positions AS pos
        MATCH (n)
        WHERE elementId(n) = pos.nodeId AND n.sketch_id = $sketch_id
        SET n.x = pos.x, n.y = pos.y
        RETURN count(n) as updated_count
        """

        params = {"positions": positions, "sketch_id": sketch_id}

        result = self._connection.query(query, params)
        return result[0]["updated_count"] if result else 0

    def get_nodes_by_ids(
        self, node_ids: List[str], sketch_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get nodes by their element IDs.

        Args:
            node_ids: List of Neo4j element IDs
            sketch_id: Investigation sketch ID (for safety)

        Returns:
            List of node properties dictionaries
        """
        if not self._connection or not node_ids:
            return []

        query = """
        UNWIND $node_ids AS node_id
        MATCH (n)
        WHERE elementId(n) = node_id AND n.sketch_id = $sketch_id
        RETURN properties(n) as data
        """

        result = self._connection.query(
            query, {"node_ids": node_ids, "sketch_id": sketch_id}
        )

        return result

    def merge_nodes(
        self,
        old_node_ids: List[str],
        new_node_data: Dict[str, Any],
        new_node_id: Optional[str],
        sketch_id: str,
    ) -> Optional[str]:
        """
        Merge multiple nodes into one, transferring all relationships.

        Args:
            old_node_ids: List of element IDs of nodes to merge
            new_node_data: Properties for the merged node
            new_node_id: Optional element ID if reusing an existing node
            sketch_id: Investigation sketch ID

        Returns:
            Element ID of the merged node
        """
        if not self._connection or not old_node_ids:
            return None

        node_type = new_node_data.get("type", "Node")
        properties = {}
        properties["sketch_id"] = sketch_id

        is_reusing_node = new_node_id and new_node_id in old_node_ids

        if is_reusing_node:
            set_clause = ", ".join(f"n.{key} = ${key}" for key in properties.keys())
            create_query = f"""
            MATCH (n)
            WHERE elementId(n) = $nodeId AND n.sketch_id = $sketch_id
            SET {set_clause}
            RETURN elementId(n) as newElementId
            """
            params = {"nodeId": new_node_id, "sketch_id": sketch_id, **properties}
        else:
            properties["created_at"] = datetime.now(timezone.utc).isoformat()
            create_query = f"""
            CREATE (n:`{node_type}`)
            SET n = $properties
            RETURN elementId(n) as newElementId
            """
            params = {"properties": properties}

        result = self._connection.query(create_query, params)
        if not result:
            return None

        new_node_element_id = result[0]["newElementId"]

        copy_relationships_query = """
        MATCH (new) WHERE elementId(new) = $newElementId

        UNWIND $oldNodeIds AS oldNodeId
        MATCH (old) WHERE elementId(old) = oldNodeId AND old.sketch_id = $sketch_id

        WITH new, collect(old) as oldNodes
        UNWIND oldNodes as old
        MATCH (src)-[r]->(old)
        WHERE elementId(src) NOT IN $oldNodeIds AND elementId(src) <> $newElementId
        WITH new, src, type(r) as relType, properties(r) as relProps, r
        MERGE (src)-[newRel:RELATED_TO {sketch_id: $sketch_id}]->(new)
        SET newRel = relProps

        WITH new, $oldNodeIds as oldNodeIds
        UNWIND oldNodeIds AS oldNodeId
        MATCH (old) WHERE elementId(old) = oldNodeId AND old.sketch_id = $sketch_id

        MATCH (old)-[r]->(dst)
        WHERE elementId(dst) NOT IN oldNodeIds AND elementId(dst) <> $newElementId
        WITH new, dst, type(r) as relType, properties(r) as relProps
        MERGE (new)-[newRel:RELATED_TO {sketch_id: $sketch_id}]->(dst)
        SET newRel = relProps
        """

        self._connection.query(
            copy_relationships_query,
            {
                "newElementId": new_node_element_id,
                "oldNodeIds": old_node_ids,
                "sketch_id": sketch_id,
            },
        )

        nodes_to_delete = [nid for nid in old_node_ids if nid != new_node_element_id]
        if nodes_to_delete:
            delete_query = """
            UNWIND $nodeIds AS nodeId
            MATCH (old)
            WHERE elementId(old) = nodeId AND old.sketch_id = $sketch_id
            DETACH DELETE old
            """
            self._connection.query(
                delete_query, {"nodeIds": nodes_to_delete, "sketch_id": sketch_id}
            )

        return new_node_element_id

    def get_neighbors(self, node_id: str, sketch_id: str) -> Dict[str, Any]:
        """
        Get a node and all its direct relationships and connected nodes
        within the same sketch.

        Returns:
            {
                "nodes": [ { "id", "data" } ],
                "edges": [ { "id", "source", "target", "label" } ]
            }
        """

        if not self._connection:
            return {"nodes": [], "edges": []}

        query = """
        MATCH (n)
        WHERE elementId(n) = $node_id AND n.sketch_id = $sketch_id

        OPTIONAL MATCH (n)-[r]-(other)
        WHERE other.sketch_id = $sketch_id AND other <> n

        RETURN
            elementId(n)     AS center_id,
            properties(n)    AS center_data,

            elementId(r)     AS rel_id,
            type(r)          AS rel_label,

            elementId(other) AS other_id,
            properties(other) AS other_data,

            CASE
                WHEN r IS NULL THEN NULL
                WHEN startNode(r) = n THEN 'outgoing'
                ELSE 'incoming'
            END AS direction
        """

        result = self._connection.query(
            query,
            {"node_id": node_id, "sketch_id": sketch_id},
        )

        if not result:
            return {"nodes": [], "edges": []}

        first = result[0]
        center_node = {
            "id": first["center_id"],
            "data": first["center_data"],
        }

        nodes = {center_node["id"]: center_node}
        edges = {}

        for record in result:
            if not record["rel_id"]:
                continue

            other_id = record["other_id"]

            # nodes
            if other_id not in nodes:
                nodes[other_id] = {
                    "id": other_id,
                    "data": record["other_data"],
                }

            # edges
            if record["rel_id"] not in edges:
                if record["direction"] == "outgoing":
                    source, target = center_node["id"], other_id
                else:
                    source, target = other_id, center_node["id"]

                edges[record["rel_id"]] = {
                    "id": record["rel_id"],
                    "source": source,
                    "target": target,
                    "label": record["rel_label"],
                }

        return {
            "nodes": list(nodes.values()),
            "edges": list(edges.values()),
        }

    def count_nodes_by_sketch(self, sketch_id: str) -> int:
        """
        Count total number of nodes for a given sketch.

        Args:
            sketch_id: The sketch ID to count nodes for

        Returns:
            int: Total number of nodes
        """
        query = """
        OPTIONAL MATCH (n)
        WHERE n.sketch_id = $sketch_id AND n IS NOT NULL
        RETURN count(n) as total
        """

        with self._connection.get_driver().session() as session:
            result = session.run(query, sketch_id=sketch_id)
            record = result.single()
            return record["total"] if record else 0

    def count_edges_by_sketch(self, sketch_id: str) -> int:
        """
        Count total number of relationships/edges for a given sketch.

        Args:
            sketch_id: The sketch ID to count edges for

        Returns:
            int: Total number of relationships
        """
        query = """
        OPTIONAL MATCH (n)-[r]->(m)
        WHERE n.sketch_id = $sketch_id AND m.sketch_id = $sketch_id
        RETURN count(r) as total
        """

        with self._connection.get_driver().session() as session:
            result = session.run(query, sketch_id=sketch_id)
            record = result.single()
            return record["total"] if record else 0

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - auto-flush batch."""
        if exc_type is None:
            self.flush_batch()
        else:
            self.clear_batch()
