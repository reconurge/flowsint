from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)

def test_add_edge_success():
    sketch_id = "sketch-123"
    edge_input = {
        "from_node": {"uuid": "node-1"},
        "to_node": {"uuid": "node-2"},
        "type": "HAS_SUBDOMAIN"
    }

    mock_result = [{"r": {"type": "HAS_SUBDOMAIN", "sketch_id": sketch_id}}]

    with patch("main.neo4j_connection.query", return_value=mock_result) as mock_query:
        response = client.post(f"/sketch/{sketch_id}/edges/add", json=edge_input)

        assert response.status_code == 200
        assert response.json()["status"] == "edge added"
        assert response.json()["edge"]["sketch_id"] == sketch_id

        expected_query_part = "MERGE (a)-[r:`HAS_SUBDOMAIN`"
        args, kwargs = mock_query.call_args
        assert expected_query_part in args[0]
        assert kwargs is None or kwargs.get("sketch_id") == sketch_id
