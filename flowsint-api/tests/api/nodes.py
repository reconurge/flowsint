from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)

def test_add_node_success():
    sketch_id = "sketch-abc"
    node_payload = {
        "type": "Domain",
        "data": {
            "label": "example.com",
            "color": "#ff0000",
            "ip": "1.2.3.4"
        }
    }

    # Mock de la réponse Neo4j attendue
    mock_result = [{
        "node": {
            "uuid": "node-uuid-123",
            "type": "Domain",
            "label": "example.com",
            "color": "#ff0000",
            "ip": "1.2.3.4",
            "caption": "example.com",
            "size": 40,
            "sketch_id": sketch_id,
        }
    }]

    with patch("main.neo4j_connection.query", return_value=mock_result) as mock_query:
        response = client.post(f"/sketch/{sketch_id}/nodes/add", json=node_payload)

        assert response.status_code == 200
        json_data = response.json()
        assert json_data["status"] == "node added"
        assert json_data["node"]["label"] == "example.com"
        assert json_data["node"]["data"] == node_payload["data"]

        # Vérifie qu'on a bien appelé Neo4j avec une requête contenant MERGE et le bon type
        args, kwargs = mock_query.call_args
        assert f"MERGE (d:`{node_payload['type']}`" in args[0]
        assert kwargs is None or kwargs.get("sketch_id") == sketch_id
