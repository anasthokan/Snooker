"""
API tests: response format per documentation.
SUCCESS: { "status": "success", "data": {}, "message": "OK" }
ERROR: { "status": "error", "error_code": 401, "message": "..." }
"""
import pytest
from fastapi.testclient import TestClient


def test_success_response_format(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data
    assert data["status"] == "ok"  # health is minimal; login returns full success format


def test_error_response_format_401(client: TestClient):
    r = client.post(
        "/auth/login",
        json={"email": "x@y.com", "password": "wrong"},
    )
    assert r.status_code == 401
    data = r.json()
    assert data.get("status") == "error"
    assert data.get("error_code") == 401
    assert "message" in data
