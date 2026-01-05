"""
Graph database repository for Neo4j operations.

This module provides a repository pattern implementation for Neo4j,
handling node and relationship operations with batching support.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from pydantic import BaseModel

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

    @staticmethod
    def _get_primary_field(obj: BaseModel) -> str:
        """Get the primary field of a Pydantic object."""
        model_fields = obj.__class__.model_fields

        primary_field = None
        for field_name, field_info in model_fields.items():
            if field_info.json_schema_extra and field_info.json_schema_extra.get(
                "primary"
            ):
                primary_field = field_name
                break

        if primary_field is None:
            for field_name, field_info in model_fields.items():
                if field_info.is_required():
                    primary_field = field_name
                    break
            if primary_field is None:
                primary_field = next(iter(model_fields.keys()))

        return primary_field

    @staticmethod
    def _extract_primary_value(obj: BaseModel) -> Any:
        """
        Extract the primitive value from a Pydantic object recursively.
        Uses model_dump to properly serialize Pydantic types like HttpUrl.
        """
        primary_field = GraphRepository._get_primary_field(obj)
        obj_dict = (
            obj.model_dump(mode="json") if hasattr(obj, "model_dump") else obj.dict()
        )
        value = obj_dict.get(primary_field)

        if isinstance(value, dict):
            nested_obj = getattr(obj, primary_field)
            if isinstance(nested_obj, BaseModel):
                return GraphRepository._extract_primary_value(nested_obj)

        return value

    def create_node(
        self,
        node_obj: BaseModel,
        sketch_id: Optional[str] = None,
        **properties: Any,
    ) -> Optional[str]:
        """
        Create or update a single node in Neo4j.

        Supports 1 signature:
        1. Pydantic object: create_node(obj, sketch_id="...", **overrides)

        Args:
            node_obj: a Pydantic object
            sketch_id: Investigation sketch ID (required)
            **properties: Additional node properties or overrides

        Returns:
            Element ID of created/updated node
        """
        if not self._connection:
            return None

        query, params = self._build_node_query(node_obj, sketch_id, **properties)
        result = self._connection.query(query, params)
        return result[0]["id"] if result else None

    def create_relationship(
        self,
        from_obj: BaseModel,
        to_obj: BaseModel,
        rel_label: Optional[str] = None,
        sketch_id: Optional[str] = None,
        **properties: Any,
    ) -> None:
        """
        Create a relationship between two nodes.

        Supports one signature:
         - Pydantic objects: create_relationship(obj1, obj2, "REL_TYPE", sketch_id="...")

        Args:
            from_obj: a Pydantic object (source)
            to_obj: a Pydantic object (target)
            rel_label: Relationship label (ex: "IS_CONNECTED_TO")
            sketch_id: Investigation sketch ID (required)
            **properties: Additional relationship properties
        """
        if not self._connection:
            return

        query, params = self._build_relationship_query(
            from_obj, to_obj, rel_label, sketch_id, **properties
        )

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
        self,
        node_obj: BaseModel,
        sketch_id: str,
        **properties: Any,
    ) -> Tuple[str, Dict[str, Any]]:
        """Build a node creation query."""

        node_type = node_obj.__class__.__name__.lower()
        primary_field = self._get_primary_field(node_obj)
        key_prop = primary_field
        key_value = getattr(node_obj, primary_field, None)

        # If primary key value is None or empty, fallback to label
        if key_value is None or (isinstance(key_value, str) and not key_value):
            key_prop = "label"
            key_value = properties.get("label") or getattr(node_obj, "label", "Node")

        if isinstance(key_value, BaseModel):
            key_value = self._extract_primary_value(key_value)

        obj_dict = (
            node_obj.model_dump(mode="json")
            if hasattr(node_obj, "model_dump")
            else node_obj.dict()
        )
        # Extract only non-dict values, skip None keys
        obj_properties = {
            k: (v if v is not None else "")
            for k, v in obj_dict.items()
            if k is not None and not isinstance(v, dict)
        }
        obj_properties.update(properties)
        properties = obj_properties

        if not sketch_id:
            raise ValueError("sketch_id is required")
        if not key_prop or key_prop is None:
            raise ValueError(f"key_prop cannot be None for node type {node_type}")

        serialized_props = GraphSerializer.serialize_properties(properties)
        serialized_props["type"] = node_type.lower()
        serialized_props["sketch_id"] = sketch_id
        label = serialized_props.get("label", key_value)
        serialized_props["label"] = label

        # Clean None keys from serialized_props
        serialized_props = {k: v for k, v in serialized_props.items() if k is not None}

        set_clauses = [
            f"n.{prop} = ${prop}"
            for prop in serialized_props.keys()
            if prop != "sketch_id"
        ]

        # Build params, ensuring no None keys
        params = {
            key_prop: key_value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **serialized_props,
        }

        # MERGE on both key_prop AND sketch_id for uniqueness per sketch
        # Use ON CREATE SET to only set created_at when creating, not updating
        query = f"""
        MERGE (n:{node_type} {{{key_prop}: ${key_prop}, sketch_id: $sketch_id}})
        ON CREATE SET n.created_at = $created_at
        SET {", ".join(set_clauses)}
        RETURN elementId(n) as id
        """

        return query, params

    def _build_relationship_query(
        self,
        from_obj: BaseModel,
        to_obj: BaseModel,
        rel_label: Optional[str] = None,
        sketch_id: Optional[str] = None,
        **properties: Any,
    ) -> Tuple[str, Dict[str, Any]]:
        """Build a relationship creation query."""
        # From object
        from_node_type = from_obj.__class__.__name__.lower()
        from_primary_field = self._get_primary_field(from_obj)
        from_obj_dict = (
            from_obj.model_dump(mode="json")
            if hasattr(from_obj, "model_dump")
            else from_obj.dict()
        )
        from_key_value = from_obj_dict.get(from_primary_field)

        if isinstance(from_key_value, dict):
            nested_obj = getattr(from_obj, from_primary_field)
            if isinstance(nested_obj, BaseModel):
                from_key_value = self._extract_primary_value(nested_obj)
        # To object
        to_node_type = to_obj.__class__.__name__.lower()
        to_primary_field = self._get_primary_field(to_obj)
        to_obj_dict = (
            to_obj.model_dump(mode="json")
            if hasattr(to_obj, "model_dump")
            else to_obj.dict()
        )
        to_key_value = to_obj_dict.get(to_primary_field)

        if isinstance(to_key_value, dict):
            nested_obj = getattr(to_obj, to_primary_field)
            if isinstance(nested_obj, BaseModel):
                to_key_value = self._extract_primary_value(nested_obj)

        from_type = from_node_type
        from_key = from_primary_field
        from_value = from_key_value
        to_type = to_node_type
        to_key = to_primary_field
        to_value = to_key_value
        rel_type = rel_label

        if not sketch_id:
            raise ValueError("sketch_id is required")
        if not from_key or from_key is None:
            raise ValueError(
                f"from_key cannot be None for relationship type {rel_type}"
            )
        if not to_key or to_key is None:
            raise ValueError(f"to_key cannot be None for relationship type {rel_type}")

        serialized_props = GraphSerializer.serialize_properties(properties)
        serialized_props["sketch_id"] = sketch_id

        # Clean None keys
        serialized_props = {k: v for k, v in serialized_props.items() if k is not None}

        if serialized_props:
            props_str = ", ".join([f"{k}: ${k}" for k in serialized_props.keys()])
            rel_props = f"{{{props_str}}}"
        else:
            rel_props = "{sketch_id: $sketch_id}"

        query = f"""
        MATCH (from:{from_type} {{{from_key}: $from_value, sketch_id: $sketch_id}})
        MATCH (to:{to_type} {{{to_key}: $to_value, sketch_id: $sketch_id}})
        MERGE (from)-[:{rel_type} {rel_props}]->(to)
        """

        params = {"from_value": from_value, "to_value": to_value, **serialized_props}
        # Clean None keys from params
        params = {k: v for k, v in params.items() if k is not None}

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
        nodes: List[BaseModel],
        sketch_id: str,
    ) -> Dict[str, Any]:
        """
        Create multiple nodes in a single batch transaction.

        Args:
            nodes: List of Pydantic model instances to create
            sketch_id: Investigation sketch ID

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
                    node_obj=node_obj,
                    sketch_id=sketch_id,
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

    def update_node(
        self,
        element_id: str,
        node_obj: BaseModel,
        sketch_id: str,
    ) -> Optional[str]:
        """
        Update an existing node's properties using a Pydantic model.

        Args:
            element_id: Neo4j element ID of the node to update
            node_obj: Pydantic model instance with updated data
            sketch_id: Investigation sketch ID (for safety)

        Returns:
            Element ID of the updated node or None if not found
        """
        if not self._connection:
            return None

        # Extract properties from Pydantic object
        obj_dict = (
            node_obj.model_dump(mode="json")
            if hasattr(node_obj, "model_dump")
            else node_obj.dict()
        )

        # Extract only non-dict values, skip None keys
        properties = {
            k: (v if v is not None else "")
            for k, v in obj_dict.items()
            if k is not None and not isinstance(v, dict)
        }

        # Serialize properties
        serialized_props = GraphSerializer.serialize_properties(properties)
        serialized_props["type"] = node_obj.__class__.__name__.lower()

        # Build SET clauses
        set_clauses = [f"n.{prop} = ${prop}" for prop in serialized_props.keys()]

        query = f"""
        MATCH (n)
        WHERE elementId(n) = $element_id AND n.sketch_id = $sketch_id
        SET {", ".join(set_clauses)}
        RETURN elementId(n) as id
        """

        params = {"element_id": element_id, "sketch_id": sketch_id, **serialized_props}
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

    def update_relationship(
        self,
        element_id: str,
        properties: Dict[str, Any],
        sketch_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Update an existing relationship's properties.

        Args:
            element_id: Neo4j element ID of the edge to update
            properties: Dictionary of properties to update
            sketch_id: Investigation sketch ID (for safety)

        Returns:
            Updated edge data or None if not found
        """
        if not self._connection:
            return None

        # Filter out None values
        filtered_props = {
            k: (v if v is not None else "")
            for k, v in properties.items()
            if k is not None
        }

        # Serialize properties
        serialized_props = GraphSerializer.serialize_properties(filtered_props)

        # Build SET clauses
        set_clauses = [f"r.{prop} = ${prop}" for prop in serialized_props.keys()]

        query = f"""
        MATCH ()-[r]->()
        WHERE elementId(r) = $element_id AND r.sketch_id = $sketch_id
        SET {", ".join(set_clauses)}
        RETURN elementId(r) as id, COALESCE(r.label, type(r)) as type, properties(r) as data
        """

        params = {"element_id": element_id, "sketch_id": sketch_id, **serialized_props}
        result = self._connection.query(query, params)
        return result[0] if result else None

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
        self, sketch_id: str, limit: int = 100000
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
            nodes_query, {"sketch_id": sketch_id, "limit": limit}
        )

        if not nodes_result:
            return {"nodes": [], "relationships": []}

        node_ids = [record["id"] for record in nodes_result]

        # Get all relationships between these nodes
        rels_query = """
        UNWIND $node_ids AS nid
        MATCH (a)-[r]->(b)
        WHERE elementId(a) = nid AND elementId(b) IN $node_ids
        RETURN elementId(r) as id,
               COALESCE(r.label, type(r)) as type,
               elementId(a) as source,
               elementId(b) as target,
               properties(r) as data
        """
        rels_result = self._connection.query(rels_query, {"node_ids": node_ids})

        return {"nodes": nodes_result, "relationships": rels_result or []}

    def create_relationship_by_element_id(
        self,
        from_element_id: str,
        to_element_id: str,
        rel_type: str,
        sketch_id: str,
        **properties: Any,
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
        # Store label as a property so it can be updated later
        if "label" not in serialized_props:
            serialized_props["label"] = rel_type

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
            **serialized_props,
        }

        result = self._connection.query(query, params)
        return result[0]["rel"] if result else None

    def query(
        self, cypher: str, parameters: Dict[str, Any] = None
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

        return [record["data"] for record in result] if result else []

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
        properties = GraphSerializer.serialize_properties(new_node_data)
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

    def get_related_nodes(self, node_id: str, sketch_id: str) -> Dict[str, Any]:
        """
        Get a node and all its direct relationships and connected nodes.

        Args:
            node_id: Element ID of the center node
            sketch_id: Investigation sketch ID

        Returns:
            Dictionary with 'nds' (nodes) and 'rls' (relationships) lists
        """
        if not self._connection:
            return {"nds": [], "rls": []}

        center_query = """
        MATCH (n)
        WHERE elementId(n) = $node_id AND n.sketch_id = $sketch_id
        RETURN elementId(n) as id, labels(n) as labels, properties(n) as data
        """

        center_result = self._connection.query(
            center_query, {"sketch_id": sketch_id, "node_id": node_id}
        )

        if not center_result:
            return {"nds": [], "rls": []}

        relationships_query = """
        MATCH (n)
        WHERE elementId(n) = $node_id AND n.sketch_id = $sketch_id
        OPTIONAL MATCH (n)-[r]->(other)
        WHERE other.sketch_id = $sketch_id
        OPTIONAL MATCH (other)-[r2]->(n)
        WHERE other.sketch_id = $sketch_id
        RETURN
            elementId(r) as rel_id,
            COALESCE(r.label, type(r)) as rel_type,
            properties(r) as rel_data,
            elementId(other) as other_node_id,
            labels(other) as other_node_labels,
            properties(other) as other_node_data,
            'outgoing' as direction
        UNION
        MATCH (n)
        WHERE elementId(n) = $node_id AND n.sketch_id = $sketch_id
        OPTIONAL MATCH (other)-[r]->(n)
        WHERE other.sketch_id = $sketch_id
        RETURN
            elementId(r) as rel_id,
            COALESCE(r.label, type(r)) as rel_type,
            properties(r) as rel_data,
            elementId(other) as other_node_id,
            labels(other) as other_node_labels,
            properties(other) as other_node_data,
            'incoming' as direction
        """

        result = self._connection.query(
            relationships_query, {"sketch_id": sketch_id, "node_id": node_id}
        )

        center_record = center_result[0]
        center_node = {
            "id": center_record["id"],
            "labels": center_record["labels"],
            "data": center_record["data"],
            "label": center_record["data"].get("label", "Node"),
            "type": "custom",
            "caption": center_record["data"].get("label", "Node"),
        }

        related_nodes = []
        relationships = []
        seen_nodes = set()
        seen_relationships = set()

        for record in result:
            if not record["rel_id"]:
                continue

            if record["rel_id"] not in seen_relationships:
                if record["direction"] == "outgoing":
                    relationships.append(
                        {
                            "id": record["rel_id"],
                            "type": "straight",
                            "source": center_node["id"],
                            "target": record["other_node_id"],
                            "data": record["rel_data"],
                            "caption": record["rel_type"],
                        }
                    )
                else:
                    relationships.append(
                        {
                            "id": record["rel_id"],
                            "type": "straight",
                            "source": record["other_node_id"],
                            "target": center_node["id"],
                            "data": record["rel_data"],
                            "caption": record["rel_type"],
                        }
                    )
                seen_relationships.add(record["rel_id"])

            if (
                record["other_node_id"]
                and record["other_node_id"] not in seen_nodes
                and record["other_node_id"] != center_node["id"]
            ):
                related_nodes.append(
                    {
                        "id": record["other_node_id"],
                        "labels": record["other_node_labels"],
                        "data": record["other_node_data"],
                        "label": record["other_node_data"].get("label", "Node"),
                        "type": "custom",
                        "caption": record["other_node_data"].get("label", "Node"),
                    }
                )
                seen_nodes.add(record["other_node_id"])

        all_nodes = [center_node] + related_nodes

        return {"nds": all_nodes, "rls": relationships}

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - auto-flush batch."""
        if exc_type is None:
            self.flush_batch()
        else:
            self.clear_batch()
