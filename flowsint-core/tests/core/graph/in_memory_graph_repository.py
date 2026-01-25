"""
In-memory implementation of GraphRepositoryProtocol for testing.

This module provides a lightweight graph repository that stores data in memory,
enabling fast unit tests without requiring a Neo4j database connection.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4


class InMemoryGraphRepository:
    """
    In-memory implementation of GraphRepositoryProtocol for testing.

    Stores nodes and edges in dictionaries, no Neo4j required.
    All operations are synchronous and data is lost when the instance is destroyed.
    """

    def __init__(self):
        self._nodes: Dict[str, Dict[str, Any]] = {}  # element_id -> node_data
        self._edges: Dict[str, Dict[str, Any]] = {}  # element_id -> edge_data
        self._batch_operations: List[tuple] = []
        self._batch_size = 100

    def _generate_element_id(self, prefix: str = "mem") -> str:
        """Generate a unique element ID."""
        return f"{prefix}:{uuid4()}"

    # -------------------------------------------------------------------------
    # Core node operations
    # -------------------------------------------------------------------------

    def create_node(self, node_obj: Dict[str, Any], sketch_id: str) -> Optional[str]:
        """Create or update a single node. Returns element ID."""
        node_label = node_obj.get("nodeLabel")
        node_type = node_obj.get("nodeType")

        # Check if node already exists (MERGE behavior)
        for element_id, data in self._nodes.items():
            if (
                data.get("nodeLabel") == node_label
                and data.get("sketch_id") == sketch_id
            ):
                # Update existing node
                self._nodes[element_id].update(node_obj)
                return element_id

        # Create new node
        element_id = self._generate_element_id("node")
        self._nodes[element_id] = {
            **node_obj,
            "sketch_id": sketch_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "_labels": [node_type] if node_type else ["Node"],
        }
        return element_id

    def update_node(
        self, element_id: str, updates: Dict[str, Any], sketch_id: str
    ) -> Optional[str]:
        """Update a node by its element ID. Returns element ID."""
        if element_id not in self._nodes:
            return None
        if self._nodes[element_id].get("sketch_id") != sketch_id:
            return None
        self._nodes[element_id].update(updates)
        return element_id

    def delete_nodes(self, node_ids: List[str], sketch_id: str) -> int:
        """Delete nodes by their element IDs. Returns count deleted."""
        deleted = 0
        for node_id in node_ids:
            if node_id in self._nodes:
                if self._nodes[node_id].get("sketch_id") == sketch_id:
                    # Also delete related edges
                    edges_to_delete = [
                        eid
                        for eid, edge in self._edges.items()
                        if edge.get("source") == node_id
                        or edge.get("target") == node_id
                    ]
                    for eid in edges_to_delete:
                        del self._edges[eid]
                    del self._nodes[node_id]
                    deleted += 1
        return deleted

    def delete_all_sketch_nodes(self, sketch_id: str) -> int:
        """Delete all nodes for a sketch. Returns count deleted."""
        to_delete = [
            eid
            for eid, data in self._nodes.items()
            if data.get("sketch_id") == sketch_id
        ]
        for eid in to_delete:
            del self._nodes[eid]

        # Also delete related edges
        edges_to_delete = [
            eid
            for eid, data in self._edges.items()
            if data.get("sketch_id") == sketch_id
        ]
        for eid in edges_to_delete:
            del self._edges[eid]

        return len(to_delete)

    def get_nodes_by_ids(
        self, node_ids: List[str], sketch_id: str
    ) -> List[Dict[str, Any]]:
        """Get nodes by their element IDs."""
        result = []
        for node_id in node_ids:
            if node_id in self._nodes:
                node = self._nodes[node_id]
                if node.get("sketch_id") == sketch_id:
                    result.append({"data": node})
        return result

    def update_nodes_positions(
        self, positions: List[Dict[str, Any]], sketch_id: str
    ) -> int:
        """Update positions for multiple nodes. Returns count updated."""
        updated = 0
        for pos in positions:
            node_id = pos.get("nodeId")
            if node_id in self._nodes:
                if self._nodes[node_id].get("sketch_id") == sketch_id:
                    self._nodes[node_id]["x"] = pos.get("x")
                    self._nodes[node_id]["y"] = pos.get("y")
                    updated += 1
        return updated

    # -------------------------------------------------------------------------
    # Core relationship operations
    # -------------------------------------------------------------------------

    def create_relationship(self, rel_obj: Dict[str, Any], sketch_id: str) -> None:
        """Create a relationship between two nodes."""
        from_type = rel_obj.get("from_type")
        from_label = rel_obj.get("from_label")
        to_type = rel_obj.get("to_type")
        to_label = rel_obj.get("to_label")
        rel_label = rel_obj.get("rel_label", "RELATED_TO")

        # Find source and target nodes
        source_id = None
        target_id = None

        for eid, node in self._nodes.items():
            if node.get("sketch_id") != sketch_id:
                continue
            if node.get("nodeLabel") == from_label:
                source_id = eid
            if node.get("nodeLabel") == to_label:
                target_id = eid

        if source_id and target_id:
            element_id = self._generate_element_id("rel")
            self._edges[element_id] = {
                **rel_obj,
                "source": source_id,
                "target": target_id,
                "type": rel_label,
                "sketch_id": sketch_id,
            }

    def create_relationship_by_element_id(
        self,
        from_element_id: str,
        to_element_id: str,
        rel_label: str,
        sketch_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Create a relationship using element IDs."""
        if from_element_id not in self._nodes or to_element_id not in self._nodes:
            return None

        element_id = self._generate_element_id("rel")
        edge_data = {
            "source": from_element_id,
            "target": to_element_id,
            "type": rel_label,
            "sketch_id": sketch_id,
        }
        self._edges[element_id] = edge_data
        return {"sketch_id": sketch_id}

    def update_relationship(
        self, element_id: str, rel_obj: Dict[str, Any], sketch_id: str
    ) -> Optional[Dict[str, Any]]:
        """Update a relationship by its element ID."""
        if element_id not in self._edges:
            return None
        if self._edges[element_id].get("sketch_id") != sketch_id:
            return None
        self._edges[element_id].update(rel_obj)
        return {
            "id": element_id,
            "type": self._edges[element_id].get("type"),
            "data": self._edges[element_id],
        }

    def delete_relationships(self, relationship_ids: List[str], sketch_id: str) -> int:
        """Delete relationships by their element IDs. Returns count deleted."""
        deleted = 0
        for rel_id in relationship_ids:
            if rel_id in self._edges:
                if self._edges[rel_id].get("sketch_id") == sketch_id:
                    del self._edges[rel_id]
                    deleted += 1
        return deleted

    # -------------------------------------------------------------------------
    # Graph queries
    # -------------------------------------------------------------------------

    def get_sketch_graph(
        self, sketch_id: str, limit: int = 100000
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Get all nodes and edges for a sketch."""
        nodes = []
        node_ids = set()

        for eid, data in self._nodes.items():
            if data.get("sketch_id") == sketch_id:
                nodes.append(
                    {
                        "id": eid,
                        "labels": data.get("_labels", ["Node"]),
                        "data": data,
                    }
                )
                node_ids.add(eid)
                if len(nodes) >= limit:
                    break

        edges = []
        for eid, data in self._edges.items():
            if data.get("sketch_id") == sketch_id:
                if data.get("source") in node_ids and data.get("target") in node_ids:
                    edges.append(
                        {
                            "id": eid,
                            "type": data.get("type", "RELATED_TO"),
                            "source": data.get("source"),
                            "target": data.get("target"),
                            "data": data,
                        }
                    )

        return {"nodes": nodes, "edges": edges}

    def get_neighbors(self, node_id: str, sketch_id: str) -> Dict[str, Any]:
        """Get a node and all its direct relationships."""
        if node_id not in self._nodes:
            return {"nodes": [], "edges": []}

        center = self._nodes[node_id]
        if center.get("sketch_id") != sketch_id:
            return {"nodes": [], "edges": []}

        nodes = {node_id: {"id": node_id, "data": center}}
        edges = {}

        for eid, edge in self._edges.items():
            if edge.get("sketch_id") != sketch_id:
                continue

            source = edge.get("source")
            target = edge.get("target")

            if source == node_id:
                # Outgoing edge
                if target in self._nodes:
                    nodes[target] = {"id": target, "data": self._nodes[target]}
                    edges[eid] = {
                        "id": eid,
                        "source": source,
                        "target": target,
                        "label": edge.get("type"),
                    }
            elif target == node_id:
                # Incoming edge
                if source in self._nodes:
                    nodes[source] = {"id": source, "data": self._nodes[source]}
                    edges[eid] = {
                        "id": eid,
                        "source": source,
                        "target": target,
                        "label": edge.get("type"),
                    }

        return {"nodes": list(nodes.values()), "edges": list(edges.values())}

    # -------------------------------------------------------------------------
    # Merge operations
    # -------------------------------------------------------------------------

    def merge_nodes(
        self,
        old_node_ids: List[str],
        new_node_data: Dict[str, Any],
        new_node_id: Optional[str],
        sketch_id: str,
    ) -> Optional[str]:
        """Merge multiple nodes into one. Returns new element ID."""
        if not old_node_ids:
            return None

        # Determine target node ID
        if new_node_id and new_node_id in old_node_ids:
            target_id = new_node_id
            self._nodes[target_id].update(new_node_data)
        else:
            target_id = self._generate_element_id("node")
            self._nodes[target_id] = {
                **new_node_data,
                "sketch_id": sketch_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

        # Transfer relationships
        for eid, edge in list(self._edges.items()):
            if edge.get("source") in old_node_ids and edge.get("source") != target_id:
                edge["source"] = target_id
            if edge.get("target") in old_node_ids and edge.get("target") != target_id:
                edge["target"] = target_id

        # Delete old nodes (except target)
        for node_id in old_node_ids:
            if node_id != target_id and node_id in self._nodes:
                del self._nodes[node_id]

        return target_id

    # -------------------------------------------------------------------------
    # Batch operations
    # -------------------------------------------------------------------------

    def batch_create_nodes(
        self, nodes: List[Dict[str, Any]], sketch_id: str
    ) -> Dict[str, Any]:
        """Create multiple nodes in a single batch."""
        node_ids = []
        errors = []

        for idx, node_obj in enumerate(nodes):
            try:
                element_id = self.create_node(node_obj, sketch_id)
                if element_id:
                    node_ids.append(element_id)
            except Exception as e:
                errors.append(f"Node {idx}: {str(e)}")

        return {
            "nodes_created": len(node_ids),
            "node_ids": node_ids,
            "errors": errors,
        }

    def batch_create_edges_by_element_id(
        self, edges: List[Dict[str, Any]], sketch_id: str
    ) -> Dict[str, Any]:
        """Create multiple edges using element IDs in a single batch."""
        created = 0
        errors = []

        for idx, edge in enumerate(edges):
            try:
                from_id = edge.get("from_element_id")
                to_id = edge.get("to_element_id")
                rel_label = edge.get("rel_label", "RELATED_TO")

                if not from_id or not to_id:
                    errors.append(
                        f"Edge {idx}: Missing required fields (from_element_id or to_element_id)"
                    )
                    continue

                result = self.create_relationship_by_element_id(
                    from_id, to_id, rel_label, sketch_id
                )
                if result:
                    created += 1
            except Exception as e:
                errors.append(f"Edge {idx}: {str(e)}")

        return {"edges_created": created, "errors": errors}

    def add_to_batch(self, operation_type: str, **kwargs: Any) -> None:
        """Add an operation to the batch queue."""
        if operation_type not in ("node", "relationship"):
            raise ValueError(f"Unknown operation type: {operation_type}")

        self._batch_operations.append((operation_type, kwargs))

        if len(self._batch_operations) >= self._batch_size:
            self.flush_batch()

    def flush_batch(self) -> None:
        """Execute all batched operations."""
        for op_type, kwargs in self._batch_operations:
            if op_type == "node":
                self.create_node(kwargs["node_obj"], kwargs["sketch_id"])
            elif op_type == "relationship":
                self.create_relationship(kwargs["rel_obj"], kwargs["sketch_id"])
        self._batch_operations.clear()

    def clear_batch(self) -> None:
        """Clear the batch without executing."""
        self._batch_operations.clear()

    def set_batch_size(self, size: int) -> None:
        """Set the batch size for auto-flushing."""
        if size < 1:
            raise ValueError("Batch size must be at least 1")
        self._batch_size = size

    # -------------------------------------------------------------------------
    # Custom queries
    # -------------------------------------------------------------------------

    def query(
        self, cypher: str, parameters: Dict[str, Any] = {}
    ) -> List[Dict[str, Any]]:
        """
        Execute a custom Cypher query.

        Note: In-memory implementation doesn't support Cypher.
        Override this method or mock it for specific test cases.
        """
        return []

    # -------------------------------------------------------------------------
    # Context manager
    # -------------------------------------------------------------------------

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - auto-flush batch on success."""
        if exc_type is None:
            self.flush_batch()
        else:
            self.clear_batch()

    # -------------------------------------------------------------------------
    # Test helpers
    # -------------------------------------------------------------------------

    def get_node_count(self, sketch_id: Optional[str] = None) -> int:
        """Get total node count, optionally filtered by sketch_id."""
        if sketch_id:
            return sum(
                1 for n in self._nodes.values() if n.get("sketch_id") == sketch_id
            )
        return len(self._nodes)

    def get_edge_count(self, sketch_id: Optional[str] = None) -> int:
        """Get total edge count, optionally filtered by sketch_id."""
        if sketch_id:
            return sum(
                1 for e in self._edges.values() if e.get("sketch_id") == sketch_id
            )
        return len(self._edges)

    def clear(self) -> None:
        """Clear all data (useful between tests)."""
        self._nodes.clear()
        self._edges.clear()
        self._batch_operations.clear()
