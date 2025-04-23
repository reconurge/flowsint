from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_start_scan_no_body():
    body = {}
    response = client.post("/scan", data=body)
    assert response.status_code == 403
    data = response.json()
    assert(data["detail"] == "Not authenticated")
    assert data is not None
    
def test_get_scans_list():
    response = client.get("/scanners")
    assert response.status_code == 200
    data = response.json()

    assert "scanners" in data
    assert isinstance(data["scanners"], dict)
    for key in data["scanners"].keys():
        scanner = data["scanners"][key]
        assert isinstance(scanner, dict)
        assert "class_name" in scanner
        assert "name" in scanner
        assert "module" in scanner
        assert "key" in scanner
    
def test_get_scans_list_for_editor():
    response = client.get("/transforms/nodes")
    assert response.status_code == 200
    data = response.json()

    assert "items" in data
    assert isinstance(data["items"], dict)

    categories = ["social_account", "emails", "websites", "phones", "leaks"]
    for category in categories:
        assert category in data["items"]
        assert isinstance(data["items"][category], list)
        assert len(data["items"][category]) > 0
        
        for scanner in data["items"][category]:
            assert isinstance(scanner, dict)
            assert "class_name" in scanner
            assert "name" in scanner
            assert "module" in scanner
            assert "key" in scanner
            
            assert isinstance(scanner["class_name"], str)
            assert len(scanner["class_name"]) > 0
            assert isinstance(scanner["name"], str)
            assert len(scanner["name"]) > 0

    assert "types" in data["items"]
    assert isinstance(data["items"]["types"], list)
    assert len(data["items"]["types"]) > 0

    for osint_type in data["items"]["types"]:
        assert isinstance(osint_type, dict)
        assert "name" in osint_type
        assert "regex" in osint_type
        assert "description" in osint_type
        
        assert isinstance(osint_type["regex"], str)
        assert len(osint_type["regex"]) > 0


def test_vaildate_transform_no_scans():
    body = {"scanners": []}
    response = client.post("/transforms/validate", json=body)
    data = response.json()
    assert(data["valid"] == False)
    assert(data["reason"] == "No scanners provided")

def test_vaildate_transform_invalid_scans():
    body = {"scanners": ["sherlock_scanner", "maigret_scanner", "dummy_scanner"]}
    response = client.post("/transforms/validate", json=body)
    data = response.json()
    assert(data["valid"] == False)
    assert(data["reason"] == "Scanner 'dummy_scanner' not found in registry")
    
def test_vaildate_transform_valid_scans():
    body = {"scanners": ["sherlock_scanner", "maigret_scanner", "ignorant_scanner"]}
    response = client.post("/transforms/validate", json=body)
    data = response.json()
    assert(data["valid"] == True)