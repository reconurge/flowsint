"""
Sketch service for managing sketches and graph operations.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from ..models import Sketch
from ..graph import create_graph_service, GraphNode
from ..graph.types import GraphData
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError, ValidationError, DatabaseError


class SketchService(BaseService):
    """
    Service for sketch CRUD operations and graph interactions.
    """

    def _get_sketch_with_permission(
        self, sketch_id: UUID, user_id: UUID, actions: List[str]
    ) -> Sketch:
        """Get sketch and verify user has permission."""
        sketch = self._db.query(Sketch).filter(Sketch.id == sketch_id).first()
        if not sketch:
            raise NotFoundError("Sketch not found")
        self._check_permission(user_id, sketch.investigation_id, actions)
        return sketch

    def list_sketches(self, user_id: UUID) -> List[Sketch]:
        """Get all sketches owned by a user."""
        return self._db.query(Sketch).filter(Sketch.owner_id == user_id).all()

    def get_by_id(self, sketch_id: UUID, user_id: UUID) -> Sketch:
        """Get a sketch by ID with permission check."""
        return self._get_sketch_with_permission(sketch_id, user_id, ["read"])

    def create(
        self,
        title: str,
        description: Optional[str],
        investigation_id: UUID,
        owner_id: UUID,
    ) -> Sketch:
        """
        Create a new sketch.

        Args:
            title: Sketch title
            description: Sketch description
            investigation_id: Parent investigation ID
            owner_id: Owner user ID

        Returns:
            The created sketch

        Raises:
            ValidationError: If investigation_id is missing
            PermissionDeniedError: If user can't create in this investigation
        """
        if not investigation_id:
            raise ValidationError("Investigation not found")

        self._check_permission(owner_id, investigation_id, ["create"])

        sketch = Sketch(
            title=title,
            description=description,
            investigation_id=investigation_id,
            owner_id=owner_id,
        )
        self._add(sketch)
        self._commit()
        self._refresh(sketch)
        return sketch

    def update(
        self, sketch_id: UUID, user_id: UUID, updates: Dict[str, Any]
    ) -> Sketch:
        """Update a sketch with permission check."""
        sketch = self._get_sketch_with_permission(sketch_id, user_id, ["update"])

        for key, value in updates.items():
            if hasattr(sketch, key):
                setattr(sketch, key, value)

        self._commit()
        self._refresh(sketch)
        return sketch

    def delete(self, sketch_id: UUID, user_id: UUID) -> None:
        """Delete a sketch and its graph data."""
        sketch = self._get_sketch_with_permission(sketch_id, user_id, ["delete"])

        # Delete all nodes and relationships in Neo4j first
        try:
            graph_service = create_graph_service(
                sketch_id=str(sketch_id), enable_batching=False
            )
            graph_service.delete_all_sketch_nodes()
        except Exception as e:
            print(f"Neo4j cleanup error: {e}")
            raise DatabaseError("Failed to clean up graph data")

        # Then delete the sketch from PostgreSQL
        self._delete(sketch)
        self._commit()

    # --- Graph operations ---

    def get_graph(
        self, sketch_id: UUID, user_id: UUID, format: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get the graph data for a sketch.

        Args:
            sketch_id: Sketch ID
            user_id: User ID for permission check
            format: Optional format ("inline" for inline relationships)

        Returns:
            Graph data as dict with "nds" and "rls" keys, or inline format
        """
        sketch = self._get_sketch_with_permission(sketch_id, user_id, ["read"])

        graph_service = create_graph_service(
            sketch_id=str(sketch_id), enable_batching=False
        )
        graph_data = graph_service.get_sketch_graph()

        if format == "inline":
            from flowsint_core.utils import get_inline_relationships
            return get_inline_relationships(graph_data.nodes, graph_data.edges)

        graph = graph_data.model_dump(mode="json", serialize_as_any=True)
        return {"nds": graph["nodes"], "rls": graph["edges"]}

    def add_node(
        self, sketch_id: UUID, user_id: UUID, node: GraphNode
    ) -> Dict[str, Any]:
        """Add a node to the sketch graph."""
        self._get_sketch_with_permission(sketch_id, user_id, ["update"])

        try:
            graph_service = create_graph_service(
                sketch_id=str(sketch_id), enable_batching=False
            )
            node_id = graph_service.create_node(node)
        except Exception as e:
            print(e)
            raise DatabaseError(f"Database error: {str(e)}")

        if not node_id:
            raise ValidationError("Node creation failed")

        node.id = node_id
        return {"status": "node added", "node": node}

    def add_relationship(
        self,
        sketch_id: UUID,
        user_id: UUID,
        source: str,
        target: str,
        label: str = "RELATED_TO",
    ) -> Dict[str, Any]:
        """Add a relationship between nodes."""
        self._get_sketch_with_permission(sketch_id, user_id, ["update"])

        try:
            graph_service = create_graph_service(
                sketch_id=str(sketch_id), enable_batching=False
            )
            result = graph_service.create_relationship_by_element_id(
                from_element_id=source,
                to_element_id=target,
                rel_label=label,
            )
        except Exception as e:
            print(f"Edge creation error: {e}")
            raise DatabaseError("Failed to create edge")

        if not result:
            raise ValidationError("Edge creation failed")

        return {"status": "edge added", "edge": result}

    def update_node(
        self, sketch_id: UUID, user_id: UUID, node_id: str, updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a node's properties."""
        self._get_sketch_with_permission(sketch_id, user_id, ["update"])

        try:
            graph_service = create_graph_service(
                sketch_id=str(sketch_id), enable_batching=False
            )
            updated_element_id = graph_service.update_node(
                element_id=node_id, updates=updates
            )
        except Exception as e:
            print(f"Node update error: {e}")
            raise DatabaseError("Failed to update node")

        if not updated_element_id:
            raise NotFoundError("Node not found or not accessible")

        return {"status": "node updated", "node": {"id": updated_element_id}}

    def update_node_positions(
        self, sketch_id: UUID, user_id: UUID, positions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Update positions for multiple nodes."""
        self._get_sketch_with_permission(sketch_id, user_id, ["update"])

        if not positions:
            return {"status": "no positions to update", "count": 0}

        try:
            graph_service = create_graph_service(
                sketch_id=str(sketch_id), enable_batching=False
            )
            updated_count = graph_service.update_nodes_positions(positions=positions)
        except Exception as e:
            print(f"Position update error: {e}")
            raise DatabaseError("Failed to update node positions")

        return {"status": "positions updated", "count": updated_count}

    def delete_nodes(
        self, sketch_id: UUID, user_id: UUID, node_ids: List[str]
    ) -> Dict[str, Any]:
        """Delete nodes from the graph."""
        self._get_sketch_with_permission(sketch_id, user_id, ["update"])

        try:
            graph_service = create_graph_service(
                sketch_id=str(sketch_id), enable_batching=False
            )
            deleted_count = graph_service.delete_nodes(node_ids)
        except Exception as e:
            print(f"Node deletion error: {e}")
            raise DatabaseError("Failed to delete nodes")

        return {"status": "nodes deleted", "count": deleted_count}

    def delete_relationships(
        self, sketch_id: UUID, user_id: UUID, relationship_ids: List[str]
    ) -> Dict[str, Any]:
        """Delete relationships from the graph."""
        self._get_sketch_with_permission(sketch_id, user_id, ["update"])

        try:
            graph_service = create_graph_service(
                sketch_id=str(sketch_id), enable_batching=False
            )
            deleted_count = graph_service.delete_relationships(relationship_ids)
        except Exception as e:
            print(f"Relationship deletion error: {e}")
            raise DatabaseError("Failed to delete relationships")

        return {"status": "relationships deleted", "count": deleted_count}

    def update_relationship(
        self,
        sketch_id: UUID,
        user_id: UUID,
        relationship_id: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update a relationship's properties."""
        self._get_sketch_with_permission(sketch_id, user_id, ["update"])

        try:
            graph_service = create_graph_service(
                sketch_id=str(sketch_id), enable_batching=False
            )
            result = graph_service.update_relationship(
                element_id=relationship_id, properties=data
            )
        except Exception as e:
            print(f"Relationship update error: {e}")
            raise DatabaseError("Failed to update relationship")

        if not result:
            raise NotFoundError("Relationship not found or not accessible")

        return {
            "status": "relationship updated",
            "relationship": {
                "id": result["id"],
                "label": result["type"],
                "data": result["data"],
            },
        }

    def merge_nodes(
        self,
        sketch_id: UUID,
        user_id: UUID,
        old_node_ids: List[str],
        new_node_id: str,
        node_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Merge multiple nodes into one."""
        from flowsint_core.utils import flatten

        self._get_sketch_with_permission(sketch_id, user_id, ["update"])

        if not old_node_ids:
            raise ValidationError("oldNodes cannot be empty")

        node_type = node_data.get("type", "Node")
        properties = {
            "type": node_type.lower(),
            "label": node_data.get("label", "Merged Node"),
        }
        flattened_data = flatten(node_data)
        properties.update(flattened_data)

        try:
            graph_service = create_graph_service(
                sketch_id=str(sketch_id), enable_batching=False
            )
            new_node_element_id = graph_service.merge_nodes(
                old_node_ids=old_node_ids,
                new_node_data=properties,
                new_node_id=new_node_id,
            )
        except Exception as e:
            print(f"Node merge error: {e}")
            raise DatabaseError(f"Failed to merge nodes: {str(e)}")

        if not new_node_element_id:
            raise DatabaseError("Failed to merge nodes")

        return {
            "status": "nodes merged",
            "count": len(old_node_ids),
            "new_node_id": new_node_element_id,
        }

    def get_neighbors(
        self, sketch_id: UUID, user_id: UUID, node_id: str
    ) -> Dict[str, Any]:
        """Get neighboring nodes and edges for a node."""
        self._get_sketch_with_permission(sketch_id, user_id, ["read"])

        try:
            graph_service = create_graph_service(sketch_id=str(sketch_id))
            result = graph_service.get_neighbors(node_id)
        except Exception as e:
            print(e)
            raise DatabaseError("Failed to retrieve related nodes")

        if not result.nodes:
            raise NotFoundError("Node not found")

        return {"nds": result.nodes, "rls": result.edges}

    def export_sketch(
        self, sketch_id: UUID, user_id: UUID, format: str = "json"
    ) -> Dict[str, Any]:
        """Export sketch data."""
        sketch = self._get_sketch_with_permission(sketch_id, user_id, ["read"])

        graph_service = create_graph_service(
            sketch_id=str(sketch_id), enable_batching=False
        )
        graph_data = graph_service.get_sketch_graph()

        if format == "json":
            return {
                "sketch": {
                    "id": str(sketch.id),
                    "title": sketch.title,
                    "description": sketch.description,
                },
                "nodes": [node.model_dump(mode="json") for node in graph_data.nodes],
                "edges": [edge.model_dump(mode="json") for edge in graph_data.edges],
            }
        else:
            raise ValidationError(f"Unsupported format: {format}")


def create_sketch_service(db: Session) -> SketchService:
    """
    Factory function to create a SketchService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured SketchService instance
    """
    return SketchService(db=db)
