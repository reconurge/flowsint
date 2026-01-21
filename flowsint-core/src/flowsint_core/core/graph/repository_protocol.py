"""
Protocol for graph repository implementations.

This module defines the interface contract that all graph repository
implementations must follow, enabling dependency injection and easier testing.
"""

from typing import Any, Dict, List, Optional, Protocol, Tuple

from .types import Neo4jDict


class GraphRepositoryProtocol(Protocol):
    """
    Protocol defining the interface for graph repository implementations.

    This protocol enables:
    - Dependency injection in GraphService
    - Easy mocking and testing without patching
    - Alternative implementations (e.g., InMemoryGraphRepository)
    """

    # Core node operations
    def create_node(self, node_obj: Neo4jDict, sketch_id: str) -> Optional[str]:
        """Create or update a single node. Returns element ID."""
        ...

    def update_node(
        self, element_id: str, updates: Neo4jDict, sketch_id: str
    ) -> Optional[str]:
        """Update a node by its element ID. Returns element ID."""
        ...

    def delete_nodes(self, node_ids: List[str], sketch_id: str) -> int:
        """Delete nodes by their element IDs. Returns count deleted."""
        ...

    def delete_all_sketch_nodes(self, sketch_id: str) -> int:
        """Delete all nodes for a sketch. Returns count deleted."""
        ...

    def get_nodes_by_ids(
        self, node_ids: List[str], sketch_id: str
    ) -> List[Dict[str, Any]]:
        """Get nodes by their element IDs."""
        ...

    def update_nodes_positions(
        self, positions: List[Dict[str, Any]], sketch_id: str
    ) -> int:
        """Update positions for multiple nodes. Returns count updated."""
        ...

    # Core relationship operations
    def create_relationship(self, rel_obj: Neo4jDict, sketch_id: str) -> None:
        """Create a relationship between two nodes."""
        ...

    def create_relationship_by_element_id(
        self,
        from_element_id: str,
        to_element_id: str,
        rel_label: str,
        sketch_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Create a relationship using element IDs."""
        ...

    def update_relationship(
        self, element_id: str, rel_obj: Neo4jDict, sketch_id: str
    ) -> Optional[Dict[str, Any]]:
        """Update a relationship by its element ID."""
        ...

    def delete_relationships(self, relationship_ids: List[str], sketch_id: str) -> int:
        """Delete relationships by their element IDs. Returns count deleted."""
        ...

    # Graph queries
    def get_sketch_graph(
        self, sketch_id: str, limit: int = 100000
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Get all nodes and edges for a sketch."""
        ...

    def get_neighbors(self, node_id: str, sketch_id: str) -> Dict[str, Any]:
        """Get a node and all its direct relationships."""
        ...

    # Merge operations
    def merge_nodes(
        self,
        old_node_ids: List[str],
        new_node_data: Dict[str, Any],
        new_node_id: Optional[str],
        sketch_id: str,
    ) -> Optional[str]:
        """Merge multiple nodes into one. Returns new element ID."""
        ...

    # Batch operations
    def batch_create_nodes(
        self, nodes: List[Neo4jDict], sketch_id: str
    ) -> Dict[str, Any]:
        """Create multiple nodes in a single batch."""
        ...

    def batch_create_edges_by_element_id(
        self, edges: List[Neo4jDict], sketch_id: str
    ) -> Dict[str, Any]:
        """Create multiple edges using element IDs in a single batch."""
        ...

    def add_to_batch(self, operation_type: str, **kwargs: Any) -> None:
        """Add an operation to the batch queue."""
        ...

    def flush_batch(self) -> None:
        """Execute all batched operations."""
        ...

    def set_batch_size(self, size: int) -> None:
        """Set the batch size for auto-flushing."""
        ...

    # Custom queries
    def query(
        self, cypher: str, parameters: Dict[str, Any] = {}
    ) -> List[Dict[str, Any]]:
        """Execute a custom Cypher query."""
        ...
