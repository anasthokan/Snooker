"""
API tests: auth endpoints.
Per documentation: API Tests.
"""
import pytest
from fastapi.testclient import TestClient


def test_login_validation_error_empty(client: TestClient):
    r = client.post("/auth/login", json={})
    assert r.status_code == 422


def test_login_accepts_any_string_returns_401_when_no_user(client: TestClient):
    """Login accepts any string as email; returns 401 when user not found (no 422 for format)."""
    r = client.post("/auth/login", json={"email": "not-an-email", "password": "x"})
    assert r.status_code == 401


def test_login_unauthorized_wrong_credentials(client: TestClient):
    r = client.post(
        "/auth/login",
        json={"email": "nonexistent@test.com", "password": "wrong"},
    )
    assert r.status_code == 401
    body = r.json()
    assert body.get("status") == "error"
    assert body.get("error_code") == 401


def test_refresh_validation_error(client: TestClient):
    r = client.post("/auth/refresh", json={})
    assert r.status_code == 422


def test_refresh_unauthorized_invalid_token(client: TestClient):
    r = client.post("/auth/refresh", json={"refresh_token": "invalid-token"})
    assert r.status_code == 401


def test_logout_returns_success(client: TestClient):
    r = client.post("/auth/logout")
    assert r.status_code == 200
    assert r.json().get("status") == "success"
    assert r.json().get("message") == "Logged out successfully"


def test_protected_endpoint_unauthorized_without_token(client: TestClient):
    r = client.get("/games/types")
    assert r.status_code == 401


def test_protected_endpoint_unauthorized_bad_token(client: TestClient):
    r = client.get("/games/types", headers={"Authorization": "Bearer invalid"})
    assert r.status_code == 401
