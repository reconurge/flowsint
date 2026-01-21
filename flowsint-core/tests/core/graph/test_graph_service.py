"""Tests for GraphService using dependency injection."""

import pytest
from unittest.mock import MagicMock, patch

from flowsint_types import Domain, Ip
from flowsint_core.core.graph import (
    GraphService,
    create_graph_service,
    GraphNode,
    GraphData,
    NodeMetadata,
)

from .in_memory_graph_repository import InMemoryGraphRepository


class TestGraphServiceInit:
    def test_init_with_injected_repository(self):
        """Test that a repository can be injected."""
        mock_repo = MagicMock()
        mock_logger = MagicMock()

        service = GraphService(
            sketch_id="sketch-1",
            repository=mock_repo,
            logger=mock_logger,
            enable_batching=True,
        )

        assert service._sketch_id == "sketch-1"
        assert service._repository == mock_repo
        assert service._logger == mock_logger
        assert service._enable_batching is True

    def test_init_with_in_memory_repository(self):
        """Test initialization with InMemoryGraphRepository."""
        repo = InMemoryGraphRepository()
        service = GraphService(sketch_id="sketch-1", repository=repo)

        assert service._sketch_id == "sketch-1"
        assert service._repository is repo

    def test_init_without_repository_raises(self):
        """Test that without repository injection, ValueError is raised."""
        with pytest.raises(ValueError, match="repository is required"):
            GraphService(sketch_id="sketch-1", repository=None)

    def test_sketch_id_property(self):
        repo = InMemoryGraphRepository()
        service = GraphService(sketch_id="sketch-1", repository=repo)
        assert service.sketch_id == "sketch-1"

    def test_repository_property(self):
        repo = InMemoryGraphRepository()
        service = GraphService(sketch_id="sketch-1", repository=repo)
        assert service.repository is repo


class TestCreateNode:
    def test_create_node_with_graph_node(self):
        """Test creating a node with injected mock repository."""
        mock_repo = MagicMock()
        mock_repo.create_node.return_value = "elem-123"

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        node = GraphNode(
            id="1",
            nodeLabel="example.com",
            nodeType="domain",
            nodeProperties=Domain(domain="example.com"),
            nodeMetadata=NodeMetadata(),
        )

        result = service.create_node(node)

        assert result == "elem-123"
        mock_repo.create_node.assert_called_once()

    def test_create_node_with_in_memory_repository(self):
        """Test creating a node with InMemoryGraphRepository."""
        repo = InMemoryGraphRepository()
        service = GraphService(sketch_id="sketch-1", repository=repo)

        node = GraphNode(
            id="1",
            nodeLabel="example.com",
            nodeType="domain",
            nodeProperties=Domain(domain="example.com"),
            nodeMetadata=NodeMetadata(),
        )

        result = service.create_node(node)

        assert result is not None
        assert repo.get_node_count("sketch-1") == 1

    def test_create_node_with_flowsint_type_raises(self):
        repo = InMemoryGraphRepository()
        service = GraphService(sketch_id="sketch-1", repository=repo)
        domain = Domain(domain="example.com")

        with pytest.raises(Exception, match="create_node method takes a GraphNode"):
            service.create_node(domain)

    def test_create_node_with_batching(self):
        mock_repo = MagicMock()
        service = GraphService(
            sketch_id="sketch-1", repository=mock_repo, enable_batching=True
        )

        node = GraphNode(
            id="1",
            nodeLabel="example.com",
            nodeType="domain",
            nodeProperties=Domain(domain="example.com"),
            nodeMetadata=NodeMetadata(),
        )

        service.create_node(node)

        mock_repo.add_to_batch.assert_called_once()
        mock_repo.create_node.assert_not_called()


class TestCreateNodeFromFlowsintType:
    def test_create_node_from_flowsint_type(self):
        mock_repo = MagicMock()
        mock_repo.create_node.return_value = "elem-123"

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        domain = Domain(domain="example.com")

        result = service.create_node_from_flowsint_type(domain)

        assert result == "elem-123"
        mock_repo.create_node.assert_called_once()

    def test_create_node_from_flowsint_type_with_graph_node_raises(self):
        repo = InMemoryGraphRepository()
        service = GraphService(sketch_id="sketch-1", repository=repo)
        node = GraphNode(
            id="1",
            nodeLabel="example.com",
            nodeType="domain",
            nodeProperties=Domain(domain="example.com"),
            nodeMetadata=NodeMetadata(),
        )

        with pytest.raises(
            Exception, match="create_node_from_flowsint_type method takes a FlowsintType"
        ):
            service.create_node_from_flowsint_type(node)

    def test_create_node_from_flowsint_type_with_batching(self):
        mock_repo = MagicMock()
        service = GraphService(
            sketch_id="sketch-1", repository=mock_repo, enable_batching=True
        )
        domain = Domain(domain="example.com")

        service.create_node_from_flowsint_type(domain)

        mock_repo.add_to_batch.assert_called_once()


class TestGetSketchGraph:
    def test_get_sketch_graph_with_mock(self):
        mock_repo = MagicMock()
        mock_repo.get_sketch_graph.return_value = {"nodes": [], "edges": []}

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        result = service.get_sketch_graph()

        assert isinstance(result, GraphData)
        mock_repo.get_sketch_graph.assert_called_once_with("sketch-1")

    def test_get_sketch_graph_with_in_memory(self):
        """Test getting sketch graph with actual data in InMemoryRepository."""
        repo = InMemoryGraphRepository()
        service = GraphService(sketch_id="sketch-1", repository=repo)

        # Add some nodes
        node1 = GraphNode(
            id="1",
            nodeLabel="example.com",
            nodeType="domain",
            nodeProperties=Domain(domain="example.com"),
            nodeMetadata=NodeMetadata(),
        )
        node2 = GraphNode(
            id="2",
            nodeLabel="1.1.1.1",
            nodeType="ip",
            nodeProperties=Ip(address="1.1.1.1"),
            nodeMetadata=NodeMetadata(),
        )

        service.create_node(node1)
        service.create_node(node2)

        result = service.get_sketch_graph()

        assert isinstance(result, GraphData)
        assert len(result.nodes) == 2


class TestGetNodesByIds:
    def test_get_nodes_by_ids(self):
        """Test that get_nodes_by_ids calls the repository correctly."""
        mock_repo = MagicMock()
        # Return empty list to avoid serialization issues in this unit test
        mock_repo.get_nodes_by_ids.return_value = []

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        result = service.get_nodes_by_ids(["id-1", "id-2"])

        mock_repo.get_nodes_by_ids.assert_called_once_with(["id-1", "id-2"], "sketch-1")
        assert result == []


class TestGetNodesByIdsForTask:
    def test_get_nodes_by_ids_for_task(self):
        """Test that get_nodes_by_ids_for_task calls the repository correctly."""
        mock_repo = MagicMock()
        # Return empty list to avoid serialization issues in this unit test
        mock_repo.get_nodes_by_ids.return_value = []

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)

        result = service.get_nodes_by_ids_for_task(["id-1"])

        mock_repo.get_nodes_by_ids.assert_called_once_with(["id-1"], "sketch-1")
        assert result == []


class TestCreateRelationship:
    def test_create_relationship(self):
        mock_repo = MagicMock()
        service = GraphService(sketch_id="sketch-1", repository=mock_repo)

        from_obj = Domain(domain="example.com")
        to_obj = Ip(address="1.1.1.1")

        service.create_relationship(from_obj, to_obj, "RESOLVES")

        mock_repo.create_relationship.assert_called_once()

    def test_create_relationship_with_batching(self):
        mock_repo = MagicMock()
        service = GraphService(
            sketch_id="sketch-1", repository=mock_repo, enable_batching=True
        )

        service.create_relationship(
            Domain(domain="a.com"), Domain(domain="b.com")
        )

        mock_repo.add_to_batch.assert_called_once()
        mock_repo.create_relationship.assert_not_called()


class TestCreateRelationshipByElementId:
    def test_create_relationship_by_element_id(self):
        mock_repo = MagicMock()
        mock_repo.create_relationship_by_element_id.return_value = {"sketch_id": "s1"}

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        result = service.create_relationship_by_element_id(
            from_element_id="elem-1",
            to_element_id="elem-2",
            rel_label="CONNECTS",
        )

        assert result == {"sketch_id": "s1"}
        mock_repo.create_relationship_by_element_id.assert_called_once_with(
            from_element_id="elem-1",
            to_element_id="elem-2",
            rel_label="CONNECTS",
            sketch_id="sketch-1",
        )


class TestGetNeighbors:
    def test_get_neighbors(self):
        mock_repo = MagicMock()
        mock_repo.get_neighbors.return_value = {"nodes": [], "edges": []}

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        result = service.get_neighbors(node_id="node-1")

        assert isinstance(result, GraphData)
        mock_repo.get_neighbors.assert_called_once_with(
            node_id="node-1", sketch_id="sketch-1"
        )


class TestUpdateNode:
    def test_update_node(self):
        mock_repo = MagicMock()
        mock_repo.update_node.return_value = "elem-1"

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        result = service.update_node("elem-1", {"nodeLabel": "updated"})

        assert result == "elem-1"
        mock_repo.update_node.assert_called_once()


class TestUpdateNodesPositions:
    def test_update_nodes_positions(self):
        mock_repo = MagicMock()
        mock_repo.update_nodes_positions.return_value = 2

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        positions = [{"nodeId": "n1", "x": 100, "y": 200}]
        result = service.update_nodes_positions(positions)

        assert result == 2
        mock_repo.update_nodes_positions.assert_called_once_with(
            positions=positions, sketch_id="sketch-1"
        )


class TestDeleteNodes:
    def test_delete_nodes(self):
        mock_repo = MagicMock()
        mock_repo.delete_nodes.return_value = 3

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        result = service.delete_nodes(["id-1", "id-2", "id-3"])

        assert result == 3
        mock_repo.delete_nodes.assert_called_once_with(
            node_ids=["id-1", "id-2", "id-3"], sketch_id="sketch-1"
        )

    def test_delete_nodes_with_in_memory(self):
        """Test delete with InMemoryRepository to verify actual behavior."""
        repo = InMemoryGraphRepository()
        service = GraphService(sketch_id="sketch-1", repository=repo)

        # Create nodes
        node1 = GraphNode(
            id="1",
            nodeLabel="example.com",
            nodeType="domain",
            nodeProperties=Domain(domain="example.com"),
            nodeMetadata=NodeMetadata(),
        )
        elem_id = service.create_node(node1)

        assert repo.get_node_count("sketch-1") == 1

        # Delete
        deleted = service.delete_nodes([elem_id])

        assert deleted == 1
        assert repo.get_node_count("sketch-1") == 0


class TestDeleteRelationships:
    def test_delete_relationships(self):
        mock_repo = MagicMock()
        mock_repo.delete_relationships.return_value = 2

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        result = service.delete_relationships(["rel-1", "rel-2"])

        assert result == 2
        mock_repo.delete_relationships.assert_called_once_with(
            relationship_ids=["rel-1", "rel-2"], sketch_id="sketch-1"
        )


class TestDeleteAllSketchNodes:
    def test_delete_all_sketch_nodes(self):
        mock_repo = MagicMock()
        mock_repo.delete_all_sketch_nodes.return_value = 10

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        result = service.delete_all_sketch_nodes()

        assert result == 10
        mock_repo.delete_all_sketch_nodes.assert_called_once_with(sketch_id="sketch-1")


class TestUpdateRelationship:
    def test_update_relationship(self):
        mock_repo = MagicMock()
        mock_repo.update_relationship.return_value = {"id": "rel-1", "weight": 5}

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        result = service.update_relationship("rel-1", {"weight": 5})

        assert result == {"id": "rel-1", "weight": 5}
        mock_repo.update_relationship.assert_called_once_with(
            element_id="rel-1", rel_obj={"weight": 5}, sketch_id="sketch-1"
        )


class TestMergeNodes:
    def test_merge_nodes(self):
        mock_repo = MagicMock()
        mock_repo.merge_nodes.return_value = "new-elem"

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        result = service.merge_nodes(
            old_node_ids=["old-1", "old-2"],
            new_node_data={"type": "domain"},
            new_node_id="old-1",
        )

        assert result == "new-elem"
        mock_repo.merge_nodes.assert_called_once_with(
            old_node_ids=["old-1", "old-2"],
            new_node_data={"type": "domain"},
            new_node_id="old-1",
            sketch_id="sketch-1",
        )


class TestBatchCreateNodes:
    def test_batch_create_nodes(self):
        mock_repo = MagicMock()
        mock_repo.batch_create_nodes.return_value = {
            "nodes_created": 2,
            "node_ids": ["id-1", "id-2"],
            "errors": [],
        }

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        nodes = [{"nodeLabel": "a"}, {"nodeLabel": "b"}]
        result = service.batch_create_nodes(nodes)

        assert result["nodes_created"] == 2
        mock_repo.batch_create_nodes.assert_called_once_with(
            nodes=nodes, sketch_id="sketch-1"
        )


class TestBatchCreateEdgesByElementId:
    def test_batch_create_edges_by_element_id(self):
        mock_repo = MagicMock()
        mock_repo.batch_create_edges_by_element_id.return_value = {
            "edges_created": 1,
            "errors": [],
        }

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        edges = [{"from_element_id": "e1", "to_element_id": "e2"}]
        result = service.batch_create_edges_by_element_id(edges)

        assert result["edges_created"] == 1
        mock_repo.batch_create_edges_by_element_id.assert_called_once_with(
            edges=edges, sketch_id="sketch-1"
        )


class TestLogGraphMessage:
    def test_log_graph_message_with_logger(self):
        mock_logger = MagicMock()
        repo = InMemoryGraphRepository()

        service = GraphService(
            sketch_id="sketch-1", repository=repo, logger=mock_logger
        )
        service.log_graph_message("Test message")

        mock_logger.graph_append.assert_called_once_with(
            "sketch-1", {"message": "Test message"}
        )

    def test_log_graph_message_without_logger(self):
        repo = InMemoryGraphRepository()
        service = GraphService(sketch_id="sketch-1", repository=repo, logger=None)
        # Should not raise
        service.log_graph_message("Test message")


class TestFlush:
    def test_flush_with_batching_enabled(self):
        mock_repo = MagicMock()
        service = GraphService(
            sketch_id="sketch-1", repository=mock_repo, enable_batching=True
        )
        service.flush()

        mock_repo.flush_batch.assert_called_once()

    def test_flush_with_batching_disabled(self):
        mock_repo = MagicMock()
        service = GraphService(
            sketch_id="sketch-1", repository=mock_repo, enable_batching=False
        )
        service.flush()

        mock_repo.flush_batch.assert_not_called()


class TestQuery:
    def test_query(self):
        mock_repo = MagicMock()
        mock_repo.query.return_value = [{"count": 5}]

        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        result = service.query("MATCH (n) RETURN count(n)", {"param": "value"})

        assert result == [{"count": 5}]
        mock_repo.query.assert_called_once_with(
            "MATCH (n) RETURN count(n)", {"param": "value"}
        )


class TestSetBatchSize:
    def test_set_batch_size(self):
        mock_repo = MagicMock()
        service = GraphService(sketch_id="sketch-1", repository=mock_repo)
        service.set_batch_size(50)

        mock_repo.set_batch_size.assert_called_once_with(50)


class TestContextManager:
    def test_context_manager_flushes_on_success(self):
        mock_repo = MagicMock()
        service = GraphService(
            sketch_id="sketch-1", repository=mock_repo, enable_batching=True
        )

        with service:
            pass

        mock_repo.flush_batch.assert_called_once()

    def test_context_manager_does_not_flush_on_exception(self):
        mock_repo = MagicMock()
        service = GraphService(
            sketch_id="sketch-1", repository=mock_repo, enable_batching=True
        )

        with pytest.raises(ValueError):
            with service:
                raise ValueError("Test error")

        mock_repo.flush_batch.assert_not_called()


class TestCreateGraphServiceFactory:
    def test_create_graph_service(self):
        mock_repo = MagicMock()

        with patch(
            "flowsint_core.core.graph.service.Neo4jGraphRepository", return_value=mock_repo
        ) as MockRepoClass:
            with patch("flowsint_core.core.logger.Logger") as MockLogger:
                service = create_graph_service(
                    sketch_id="sketch-1",
                    enable_batching=True,
                )

                # Factory should create the repository
                MockRepoClass.assert_called_once()
                assert service._sketch_id == "sketch-1"
                assert service._repository == mock_repo
                assert service._logger == MockLogger
                assert service._enable_batching is True

    def test_create_graph_service_defaults(self):
        mock_repo = MagicMock()

        with patch(
            "flowsint_core.core.graph.service.Neo4jGraphRepository", return_value=mock_repo
        ):
            with patch("flowsint_core.core.logger.Logger"):
                service = create_graph_service(sketch_id="sketch-1")

                assert service._sketch_id == "sketch-1"
                assert service._repository == mock_repo
                assert service._enable_batching is True  # Default is True in factory


class TestInMemoryRepositoryIntegration:
    """Integration tests using InMemoryGraphRepository to verify full workflows."""

    def test_full_workflow_create_and_query(self):
        """Test a complete workflow: create nodes, create relationships, query."""
        repo = InMemoryGraphRepository()
        service = GraphService(sketch_id="sketch-1", repository=repo)

        # Create two nodes
        node1 = GraphNode(
            id="1",
            nodeLabel="example.com",
            nodeType="domain",
            nodeProperties=Domain(domain="example.com"),
            nodeMetadata=NodeMetadata(),
        )
        node2 = GraphNode(
            id="2",
            nodeLabel="1.1.1.1",
            nodeType="ip",
            nodeProperties=Ip(address="1.1.1.1"),
            nodeMetadata=NodeMetadata(),
        )

        elem_id1 = service.create_node(node1)
        elem_id2 = service.create_node(node2)

        assert elem_id1 is not None
        assert elem_id2 is not None
        assert repo.get_node_count("sketch-1") == 2

        # Create a relationship
        service.create_relationship(
            Domain(domain="example.com"),
            Ip(address="1.1.1.1"),
            "RESOLVES_TO",
        )

        assert repo.get_edge_count("sketch-1") == 1

        # Query the graph
        graph = service.get_sketch_graph()
        assert len(graph.nodes) == 2
        assert len(graph.edges) == 1

    def test_batch_operations_with_in_memory(self):
        """Test batch operations work correctly with InMemoryRepository."""
        repo = InMemoryGraphRepository()
        service = GraphService(
            sketch_id="sketch-1", repository=repo, enable_batching=True
        )

        # Add nodes to batch
        for i in range(3):
            node = GraphNode(
                id=str(i),
                nodeLabel=f"node{i}.com",
                nodeType="domain",
                nodeProperties=Domain(domain=f"node{i}.com"),
                nodeMetadata=NodeMetadata(),
            )
            service.create_node(node)

        # Nodes should not be created yet (batched)
        assert repo.get_node_count("sketch-1") == 0

        # Flush the batch
        service.flush()

        # Now nodes should exist
        assert repo.get_node_count("sketch-1") == 3

    def test_sketch_isolation(self):
        """Test that different sketches are isolated."""
        repo = InMemoryGraphRepository()
        service1 = GraphService(sketch_id="sketch-1", repository=repo)
        service2 = GraphService(sketch_id="sketch-2", repository=repo)

        # Create nodes in different sketches
        node = GraphNode(
            id="1",
            nodeLabel="example.com",
            nodeType="domain",
            nodeProperties=Domain(domain="example.com"),
            nodeMetadata=NodeMetadata(),
        )

        service1.create_node(node)
        service2.create_node(node)

        # Each sketch should have its own node
        assert repo.get_node_count("sketch-1") == 1
        assert repo.get_node_count("sketch-2") == 1
        assert repo.get_node_count() == 2

        # Delete all from sketch-1
        service1.delete_all_sketch_nodes()

        assert repo.get_node_count("sketch-1") == 0
        assert repo.get_node_count("sketch-2") == 1
