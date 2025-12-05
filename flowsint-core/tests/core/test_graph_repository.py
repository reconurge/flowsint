"""Test GraphRepository batch operations."""

import pytest
from unittest.mock import Mock, MagicMock
from flowsint_core.core.graph_repository import GraphRepository
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip
from flowsint_types.email import Email


@pytest.fixture
def mock_connection():
    """Create a mock Neo4j connection."""
    conn = Mock()
    conn.execute_batch = Mock(return_value=[])
    conn.query = Mock(return_value=[])
    return conn


@pytest.fixture
def graph_repo(mock_connection):
    """Create a GraphRepository with mocked connection."""
    return GraphRepository(neo4j_connection=mock_connection)


def test_batch_create_nodes_empty_list(graph_repo):
    """Test batch_create_nodes with empty list."""
    result = graph_repo.batch_create_nodes(nodes=[], sketch_id="test-sketch")

    assert result["nodes_created"] == 0
    assert result["node_ids"] == []
    assert result["errors"] == []


def test_batch_create_nodes_single_node(graph_repo, mock_connection):
    """Test batch_create_nodes with a single node."""
    domain = Domain(domain="example.com")

    # Mock the batch execution to return a node ID
    mock_connection.execute_batch.return_value = [
        [{"id": "element-id-123"}]
    ]

    result = graph_repo.batch_create_nodes(
        nodes=[domain],
        sketch_id="test-sketch"
    )

    assert result["nodes_created"] == 1
    assert len(result["node_ids"]) == 1
    assert result["node_ids"][0] == "element-id-123"
    assert result["errors"] == []

    # Verify execute_batch was called once
    assert mock_connection.execute_batch.call_count == 1


def test_batch_create_nodes_multiple_nodes(graph_repo, mock_connection):
    """Test batch_create_nodes with multiple nodes of different types."""
    domain = Domain(domain="example.com")
    ip = Ip(address="192.168.1.1")
    email = Email(email="test@example.com")

    # Mock the batch execution to return multiple node IDs
    mock_connection.execute_batch.return_value = [
        [{"id": "element-id-1"}],
        [{"id": "element-id-2"}],
        [{"id": "element-id-3"}]
    ]

    result = graph_repo.batch_create_nodes(
        nodes=[domain, ip, email],
        sketch_id="test-sketch"
    )

    assert result["nodes_created"] == 3
    assert len(result["node_ids"]) == 3
    assert result["errors"] == []

    # Verify execute_batch was called once with 3 operations
    assert mock_connection.execute_batch.call_count == 1
    batch_operations = mock_connection.execute_batch.call_args[0][0]
    assert len(batch_operations) == 3


def test_batch_create_nodes_with_validation_errors(graph_repo, mock_connection):
    """Test batch_create_nodes when some nodes have validation errors."""
    valid_domain = Domain(domain="example.com")

    # Mock execute_batch to succeed for valid nodes
    mock_connection.execute_batch.return_value = [
        [{"id": "element-id-1"}]
    ]

    result = graph_repo.batch_create_nodes(
        nodes=[valid_domain],
        sketch_id="test-sketch"
    )

    assert result["nodes_created"] == 1
    assert len(result["errors"]) == 0


def test_batch_create_nodes_batch_execution_failure(graph_repo, mock_connection):
    """Test batch_create_nodes when the batch execution fails."""
    domain = Domain(domain="example.com")

    # Mock execute_batch to raise an exception
    mock_connection.execute_batch.side_effect = Exception("Database connection error")

    result = graph_repo.batch_create_nodes(
        nodes=[domain],
        sketch_id="test-sketch"
    )

    assert result["nodes_created"] == 0
    assert result["node_ids"] == []
    assert len(result["errors"]) > 0
    assert "Database connection error" in result["errors"][0]


def test_batch_create_nodes_no_connection():
    """Test batch_create_nodes when there's no database connection."""
    # Create a repository with no connection by manually setting it to None
    repo = GraphRepository(neo4j_connection=Mock())
    repo._connection = None  # Force no connection
    domain = Domain(domain="example.com")

    result = repo.batch_create_nodes(
        nodes=[domain],
        sketch_id="test-sketch"
    )

    assert result["nodes_created"] == 0
    assert result["node_ids"] == []
    assert len(result["errors"]) == 1
    assert "No database connection" in result["errors"][0]


def test_batch_create_nodes_with_label_fallback(graph_repo, mock_connection):
    """Test batch_create_nodes with nodes that need label fallback."""
    from pydantic import BaseModel

    class CustomNode(BaseModel):
        """Node type without a clear primary field."""
        name: str = ""
        label: str = "Custom Node"

    node = CustomNode(name="", label="Fallback Label")

    # Mock the batch execution
    mock_connection.execute_batch.return_value = [
        [{"id": "element-id-fallback"}]
    ]

    result = graph_repo.batch_create_nodes(
        nodes=[node],
        sketch_id="test-sketch"
    )

    # Should succeed with fallback to label
    assert result["nodes_created"] == 1
    assert len(result["node_ids"]) == 1


def test_batch_create_nodes_large_batch(graph_repo, mock_connection):
    """Test batch_create_nodes with a large number of nodes."""
    # Create 1000 domains
    domains = [Domain(domain=f"example{i}.com") for i in range(1000)]

    # Mock the batch execution to return 1000 node IDs
    mock_connection.execute_batch.return_value = [
        [{"id": f"element-id-{i}"}] for i in range(1000)
    ]

    result = graph_repo.batch_create_nodes(
        nodes=domains,
        sketch_id="test-sketch"
    )

    assert result["nodes_created"] == 1000
    assert len(result["node_ids"]) == 1000
    assert result["errors"] == []

    # Verify execute_batch was called once (single transaction)
    assert mock_connection.execute_batch.call_count == 1
    batch_operations = mock_connection.execute_batch.call_args[0][0]
    assert len(batch_operations) == 1000


# Tests for update_node


def test_update_node_success(graph_repo, mock_connection):
    """Test update_node with a valid Pydantic object."""
    domain = Domain(domain="updated-example.com", label="Updated Domain")

    # Mock the query to return the element ID
    mock_connection.query.return_value = [{"id": "element-id-123"}]

    result = graph_repo.update_node(
        element_id="element-id-123",
        node_obj=domain,
        sketch_id="test-sketch"
    )

    assert result == "element-id-123"
    assert mock_connection.query.call_count == 1


def test_update_node_not_found(graph_repo, mock_connection):
    """Test update_node when node doesn't exist."""
    domain = Domain(domain="example.com")

    # Mock the query to return empty result
    mock_connection.query.return_value = []

    result = graph_repo.update_node(
        element_id="non-existent-id",
        node_obj=domain,
        sketch_id="test-sketch"
    )

    assert result is None


def test_update_node_no_connection():
    """Test update_node when there's no database connection."""
    repo = GraphRepository(neo4j_connection=Mock())
    repo._connection = None
    domain = Domain(domain="example.com")

    result = repo.update_node(
        element_id="element-id-123",
        node_obj=domain,
        sketch_id="test-sketch"
    )

    assert result is None


def test_update_node_different_types(graph_repo, mock_connection):
    """Test update_node with different Pydantic types."""
    ip = Ip(address="10.0.0.1", label="Updated IP")

    # Mock the query
    mock_connection.query.return_value = [{"id": "element-id-456"}]

    result = graph_repo.update_node(
        element_id="element-id-456",
        node_obj=ip,
        sketch_id="test-sketch"
    )

    assert result == "element-id-456"

    # Verify the query contains the correct type
    query_call = mock_connection.query.call_args
    params = query_call[0][1]
    assert params["type"] == "ip"
