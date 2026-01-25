"""Tests for Neo4jGraphRepository."""

import pytest
from unittest.mock import MagicMock, patch, call
from datetime import datetime, timezone

from flowsint_core.core.graph import Neo4jGraphRepository


class TestNeo4jGraphRepositoryInit:
    def test_init_with_connection(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)
        assert repo._connection == mock_connection
        assert repo._batch_operations == []
        assert repo._batch_size == 100

    def test_init_without_connection_uses_singleton(self):
        with patch(
            "flowsint_core.core.graph.repository.Neo4jConnection.get_instance"
        ) as mock_get_instance:
            mock_connection = MagicMock()
            mock_get_instance.return_value = mock_connection
            repo = Neo4jGraphRepository()
            assert repo._connection == mock_connection


class TestCreateNode:
    def test_create_node_success(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [{"id": "element-123"}]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        node_obj = {
            "nodeLabel": "example.com",
            "nodeType": "domain",
            "nodeProperties.domain": "example.com",
        }

        result = repo.create_node(node_obj, sketch_id="sketch-1")

        assert result == "element-123"
        mock_connection.query.assert_called_once()

    def test_create_node_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.create_node({"nodeLabel": "test", "nodeType": "domain"}, "sketch-1")

        assert result is None

    def test_create_node_empty_result(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = []
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.create_node(
            {"nodeLabel": "test", "nodeType": "domain"}, sketch_id="sketch-1"
        )

        assert result is None


class TestCreateRelationship:
    def test_create_relationship_success(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        rel_obj = {
            "from_type": "domain",
            "from_label": "source.com",
            "to_type": "ip",
            "to_label": "1.1.1.1",
            "rel_label": "RESOLVES_TO",
        }

        repo.create_relationship(rel_obj, sketch_id="sketch-1")

        mock_connection.execute_write.assert_called_once()

    def test_create_relationship_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        rel_obj = {
            "from_type": "domain",
            "from_label": "source.com",
            "to_type": "ip",
            "to_label": "1.1.1.1",
            "rel_label": "RESOLVES_TO",
        }

        # Should not raise, just return early
        repo.create_relationship(rel_obj, sketch_id="sketch-1")


class TestBuildNodeQuery:
    def test_build_node_query_structure(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        node_obj = {
            "nodeLabel": "example.com",
            "nodeType": "domain",
        }

        query, params = repo._build_node_query(node_obj, sketch_id="sketch-1")

        assert "MERGE" in query
        assert "domain" in query  # nodeType used as label
        assert params["node_label"] == "example.com"
        assert params["sketch_id"] == "sketch-1"
        assert params["props"] == node_obj
        assert "created_at" in params


class TestBuildRelationshipQuery:
    def test_build_relationship_query_structure(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        rel_obj = {
            "from_type": "domain",
            "from_label": "source.com",
            "to_type": "ip",
            "to_label": "1.1.1.1",
            "rel_label": "RESOLVES_TO",
        }

        query, params = repo._build_relationship_query(rel_obj, sketch_id="sketch-1")

        assert "MATCH" in query
        assert "MERGE" in query
        assert "domain" in query
        assert "ip" in query
        assert "RESOLVES_TO" in query
        assert params["from_label"] == "source.com"
        assert params["to_label"] == "1.1.1.1"
        assert params["sketch_id"] == "sketch-1"


class TestBatchOperations:
    def test_add_to_batch_node(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        repo.add_to_batch(
            "node",
            node_obj={"nodeLabel": "test", "nodeType": "domain"},
            sketch_id="sketch-1",
        )

        assert len(repo._batch_operations) == 1

    def test_add_to_batch_relationship(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        repo.add_to_batch(
            "relationship",
            rel_obj={
                "from_type": "domain",
                "from_label": "a.com",
                "to_type": "ip",
                "to_label": "1.1.1.1",
                "rel_label": "REL",
            },
            sketch_id="sketch-1",
        )

        assert len(repo._batch_operations) == 1

    def test_add_to_batch_unknown_type_raises(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        with pytest.raises(ValueError, match="Unknown operation type"):
            repo.add_to_batch("unknown", sketch_id="sketch-1")

    def test_auto_flush_when_batch_full(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)
        repo._batch_size = 2

        repo.add_to_batch(
            "node",
            node_obj={"nodeLabel": "test1", "nodeType": "domain"},
            sketch_id="sketch-1",
        )
        assert len(repo._batch_operations) == 1

        repo.add_to_batch(
            "node",
            node_obj={"nodeLabel": "test2", "nodeType": "domain"},
            sketch_id="sketch-1",
        )

        # Should have auto-flushed
        mock_connection.execute_batch.assert_called_once()
        assert len(repo._batch_operations) == 0

    def test_flush_batch(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        # Track what was passed to execute_batch before it gets cleared
        captured_args = []

        def capture_batch(ops):
            captured_args.extend(list(ops))

        mock_connection.execute_batch.side_effect = capture_batch

        repo._batch_operations = [("query1", {"p": 1}), ("query2", {"p": 2})]

        repo.flush_batch()

        mock_connection.execute_batch.assert_called_once()
        assert len(captured_args) == 2
        assert captured_args[0] == ("query1", {"p": 1})
        assert captured_args[1] == ("query2", {"p": 2})
        assert len(repo._batch_operations) == 0

    def test_flush_batch_empty(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        repo.flush_batch()

        mock_connection.execute_batch.assert_not_called()

    def test_flush_batch_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None
        repo._batch_operations = [("query", {})]

        repo.flush_batch()

        assert len(repo._batch_operations) == 0

    def test_clear_batch(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)
        repo._batch_operations = [("query", {})]

        repo.clear_batch()

        assert len(repo._batch_operations) == 0

    def test_set_batch_size(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        repo.set_batch_size(50)

        assert repo._batch_size == 50

    def test_set_batch_size_invalid(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        with pytest.raises(ValueError, match="Batch size must be at least 1"):
            repo.set_batch_size(0)


class TestBatchCreateNodes:
    def test_batch_create_nodes_success(self):
        mock_connection = MagicMock()
        mock_connection.execute_batch.return_value = [
            [{"id": "id-1"}],
            [{"id": "id-2"}],
        ]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        nodes = [
            {"nodeLabel": "a.com", "nodeType": "domain"},
            {"nodeLabel": "b.com", "nodeType": "domain"},
        ]

        result = repo.batch_create_nodes(nodes, sketch_id="sketch-1")

        assert result["nodes_created"] == 2
        assert result["node_ids"] == ["id-1", "id-2"]
        assert result["errors"] == []

    def test_batch_create_nodes_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.batch_create_nodes(
            [{"nodeLabel": "test", "nodeType": "domain"}], sketch_id="sketch-1"
        )

        assert result["nodes_created"] == 0
        assert result["node_ids"] == []
        assert "No database connection" in result["errors"]

    def test_batch_create_nodes_empty_list(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.batch_create_nodes([], sketch_id="sketch-1")

        assert result == {"nodes_created": 0, "node_ids": [], "errors": []}

    def test_batch_create_nodes_execution_error(self):
        mock_connection = MagicMock()
        mock_connection.execute_batch.side_effect = Exception("DB error")
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.batch_create_nodes(
            [{"nodeLabel": "test", "nodeType": "domain"}], sketch_id="sketch-1"
        )

        assert result["nodes_created"] == 0
        assert "Batch execution failed" in result["errors"][0]


class TestBatchCreateEdges:
    def test_batch_create_edges_success(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        edges = [
            {
                "from_type": "domain",
                "from_label": "a.com",
                "to_type": "ip",
                "to_label": "1.1.1.1",
                "rel_label": "RESOLVES",
            }
        ]

        result = repo.batch_create_edges(edges, sketch_id="sketch-1")

        assert result["edges_created"] == 1
        assert result["errors"] == []

    def test_batch_create_edges_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.batch_create_edges([{}], sketch_id="sketch-1")

        assert result["edges_created"] == 0
        assert "No database connection" in result["errors"]

    def test_batch_create_edges_empty_list(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.batch_create_edges([], sketch_id="sketch-1")

        assert result == {"edges_created": 0, "errors": []}


class TestBatchCreateEdgesByElementId:
    def test_batch_create_edges_by_element_id_success(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        edges = [
            {
                "from_element_id": "elem-1",
                "to_element_id": "elem-2",
                "rel_label": "CONNECTS",
            }
        ]

        result = repo.batch_create_edges_by_element_id(edges, sketch_id="sketch-1")

        assert result["edges_created"] == 1
        assert result["errors"] == []

    def test_batch_create_edges_by_element_id_missing_fields(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        edges = [{"rel_label": "CONNECTS"}]  # Missing from/to element IDs

        result = repo.batch_create_edges_by_element_id(edges, sketch_id="sketch-1")

        assert result["edges_created"] == 0
        assert any("Missing required fields" in e for e in result["errors"])

    def test_batch_create_edges_by_element_id_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.batch_create_edges_by_element_id([{}], sketch_id="sketch-1")

        assert result["edges_created"] == 0
        assert "No database connection" in result["errors"]


class TestUpdateNode:
    def test_update_node_success(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [{"id": "elem-1"}]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.update_node(
            element_id="elem-1",
            updates={"nodeLabel": "updated"},
            sketch_id="sketch-1",
        )

        assert result == "elem-1"

    def test_update_node_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.update_node("elem-1", {"nodeLabel": "x"}, "sketch-1")

        assert result is None


class TestDeleteNodes:
    def test_delete_nodes_success(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [{"deleted_count": 3}]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.delete_nodes(["id-1", "id-2", "id-3"], sketch_id="sketch-1")

        assert result == 3

    def test_delete_nodes_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.delete_nodes(["id-1"], sketch_id="sketch-1")

        assert result == 0

    def test_delete_nodes_empty_list(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.delete_nodes([], sketch_id="sketch-1")

        assert result == 0
        mock_connection.query.assert_not_called()


class TestDeleteRelationships:
    def test_delete_relationships_success(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [{"deleted_count": 2}]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.delete_relationships(["rel-1", "rel-2"], sketch_id="sketch-1")

        assert result == 2

    def test_delete_relationships_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.delete_relationships(["rel-1"], sketch_id="sketch-1")

        assert result == 0

    def test_delete_relationships_empty_list(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.delete_relationships([], sketch_id="sketch-1")

        assert result == 0


class TestDeleteAllSketchNodes:
    def test_delete_all_sketch_nodes_success(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [{"deleted_count": 10}]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.delete_all_sketch_nodes(sketch_id="sketch-1")

        assert result == 10

    def test_delete_all_sketch_nodes_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.delete_all_sketch_nodes(sketch_id="sketch-1")

        assert result == 0


class TestGetSketchGraph:
    def test_get_sketch_graph_success(self):
        mock_connection = MagicMock()
        mock_connection.query.side_effect = [
            # First call: nodes query
            [
                {"id": "node-1", "labels": ["domain"], "data": {}},
                {"id": "node-2", "labels": ["ip"], "data": {}},
            ],
            # Second call: edges query
            [
                {
                    "id": "edge-1",
                    "type": "RESOLVES",
                    "source": "node-1",
                    "target": "node-2",
                    "data": {},
                }
            ],
        ]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.get_sketch_graph(sketch_id="sketch-1")

        assert len(result["nodes"]) == 2
        assert len(result["edges"]) == 1

    def test_get_sketch_graph_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.get_sketch_graph(sketch_id="sketch-1")

        assert result == {"nodes": [], "edges": []}

    def test_get_sketch_graph_no_nodes(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = []
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.get_sketch_graph(sketch_id="sketch-1")

        assert result == {"nodes": [], "edges": []}


class TestUpdateRelationship:
    def test_update_relationship_success(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [
            {"id": "rel-1", "type": "CONNECTS", "data": {"weight": 5}}
        ]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.update_relationship(
            element_id="rel-1",
            rel_obj={"weight": 5},
            sketch_id="sketch-1",
        )

        assert result["id"] == "rel-1"

    def test_update_relationship_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.update_relationship("rel-1", {}, "sketch-1")

        assert result is None


class TestCreateRelationshipByElementId:
    def test_create_relationship_by_element_id_success(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [{"rel": {"sketch_id": "sketch-1"}}]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.create_relationship_by_element_id(
            from_element_id="elem-1",
            to_element_id="elem-2",
            rel_label="CONNECTS",
            sketch_id="sketch-1",
        )

        assert result["sketch_id"] == "sketch-1"

    def test_create_relationship_by_element_id_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.create_relationship_by_element_id(
            "elem-1", "elem-2", "CONNECTS", "sketch-1"
        )

        assert result is None


class TestQuery:
    def test_query_success(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [{"count": 5}]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.query("MATCH (n) RETURN count(n) as count", {})

        assert result == [{"count": 5}]

    def test_query_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.query("MATCH (n) RETURN n", {})

        assert result == []


class TestUpdateNodesPositions:
    def test_update_nodes_positions_success(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [{"updated_count": 2}]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        positions = [
            {"nodeId": "node-1", "x": 100, "y": 200},
            {"nodeId": "node-2", "x": 300, "y": 400},
        ]

        result = repo.update_nodes_positions(positions, sketch_id="sketch-1")

        assert result == 2

    def test_update_nodes_positions_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.update_nodes_positions([{"nodeId": "x", "x": 0, "y": 0}], "s")

        assert result == 0

    def test_update_nodes_positions_empty_list(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.update_nodes_positions([], sketch_id="sketch-1")

        assert result == 0


class TestGetNodesByIds:
    def test_get_nodes_by_ids_success(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [
            {"data": {"nodeLabel": "a.com"}},
            {"data": {"nodeLabel": "b.com"}},
        ]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.get_nodes_by_ids(["id-1", "id-2"], sketch_id="sketch-1")

        assert len(result) == 2

    def test_get_nodes_by_ids_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.get_nodes_by_ids(["id-1"], sketch_id="sketch-1")

        assert result == []

    def test_get_nodes_by_ids_empty_list(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.get_nodes_by_ids([], sketch_id="sketch-1")

        assert result == []


class TestMergeNodes:
    def test_merge_nodes_create_new_node(self):
        mock_connection = MagicMock()
        mock_connection.query.side_effect = [
            [{"newElementId": "new-elem-1"}],  # Create query
            None,  # Copy relationships
            None,  # Delete old nodes
        ]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.merge_nodes(
            old_node_ids=["old-1", "old-2"],
            new_node_data={"type": "domain"},
            new_node_id=None,
            sketch_id="sketch-1",
        )

        assert result == "new-elem-1"

    def test_merge_nodes_reuse_existing_node(self):
        mock_connection = MagicMock()
        mock_connection.query.side_effect = [
            [{"newElementId": "old-1"}],  # Update existing
            None,  # Copy relationships
            None,  # Delete old nodes
        ]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.merge_nodes(
            old_node_ids=["old-1", "old-2"],
            new_node_data={"type": "domain"},
            new_node_id="old-1",  # Reusing old-1
            sketch_id="sketch-1",
        )

        assert result == "old-1"

    def test_merge_nodes_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.merge_nodes(["old-1"], {}, None, "sketch-1")

        assert result is None

    def test_merge_nodes_empty_list(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.merge_nodes([], {}, None, "sketch-1")

        assert result is None


class TestGetNeighbors:
    def test_get_neighbors_success(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [
            {
                "center_id": "node-1",
                "center_data": {"nodeLabel": "center"},
                "rel_id": "rel-1",
                "rel_label": "CONNECTS",
                "other_id": "node-2",
                "other_data": {"nodeLabel": "neighbor"},
                "direction": "outgoing",
            }
        ]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.get_neighbors(node_id="node-1", sketch_id="sketch-1")

        assert len(result["nodes"]) == 2
        assert len(result["edges"]) == 1

    def test_get_neighbors_no_relationships(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [
            {
                "center_id": "node-1",
                "center_data": {"nodeLabel": "center"},
                "rel_id": None,
                "rel_label": None,
                "other_id": None,
                "other_data": None,
                "direction": None,
            }
        ]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.get_neighbors(node_id="node-1", sketch_id="sketch-1")

        assert len(result["nodes"]) == 1
        assert len(result["edges"]) == 0

    def test_get_neighbors_no_connection(self):
        repo = Neo4jGraphRepository(neo4j_connection=None)
        repo._connection = None

        result = repo.get_neighbors("node-1", "sketch-1")

        assert result == {"nodes": [], "edges": []}

    def test_get_neighbors_not_found(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = []
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.get_neighbors("nonexistent", "sketch-1")

        assert result == {"nodes": [], "edges": []}

    def test_get_neighbors_incoming_direction(self):
        mock_connection = MagicMock()
        mock_connection.query.return_value = [
            {
                "center_id": "node-1",
                "center_data": {"nodeLabel": "center"},
                "rel_id": "rel-1",
                "rel_label": "CONNECTS",
                "other_id": "node-2",
                "other_data": {"nodeLabel": "neighbor"},
                "direction": "incoming",
            }
        ]
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.get_neighbors(node_id="node-1", sketch_id="sketch-1")

        # For incoming, source should be the other node
        edge = result["edges"][0]
        assert edge["source"] == "node-2"
        assert edge["target"] == "node-1"


class TestCountNodesBySketch:
    def test_count_nodes_by_sketch_success(self):
        mock_connection = MagicMock()
        mock_driver = MagicMock()
        mock_session = MagicMock()
        mock_result = MagicMock()
        mock_record = MagicMock()

        mock_record.__getitem__ = lambda self, key: 5 if key == "total" else None
        mock_result.single.return_value = mock_record
        mock_session.run.return_value = mock_result
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=None)
        mock_driver.session.return_value = mock_session
        mock_connection.get_driver.return_value = mock_driver

        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.count_nodes_by_sketch(sketch_id="sketch-1")

        assert result == 5


class TestCountEdgesBySketch:
    def test_count_edges_by_sketch_success(self):
        mock_connection = MagicMock()
        mock_driver = MagicMock()
        mock_session = MagicMock()
        mock_result = MagicMock()
        mock_record = MagicMock()

        mock_record.__getitem__ = lambda self, key: 3 if key == "total" else None
        mock_result.single.return_value = mock_record
        mock_session.run.return_value = mock_result
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=None)
        mock_driver.session.return_value = mock_session
        mock_connection.get_driver.return_value = mock_driver

        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)

        result = repo.count_edges_by_sketch(sketch_id="sketch-1")

        assert result == 3


class TestContextManager:
    def test_context_manager_flushes_on_success(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)
        repo._batch_operations = [("query", {})]

        with repo:
            pass

        mock_connection.execute_batch.assert_called_once()

    def test_context_manager_clears_on_exception(self):
        mock_connection = MagicMock()
        repo = Neo4jGraphRepository(neo4j_connection=mock_connection)
        repo._batch_operations = [("query", {})]

        with pytest.raises(ValueError):
            with repo:
                raise ValueError("Test error")

        # Should have cleared, not flushed
        mock_connection.execute_batch.assert_not_called()
        assert len(repo._batch_operations) == 0
