"""
Pytest configuration and shared fixtures.
Per documentation: Tools (Pytest, Postman, Swagger); Types (Unit, API, Load).
"""
import os
import pytest
from fastapi.testclient import TestClient

# Ensure test env doesn't use production secrets
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest")

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """FastAPI TestClient for API tests."""
    return TestClient(app)


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    """
    Optional: headers with Bearer token if test user exists.
    Requires DB with seeded admin (e.g. admin@gamehub.local / Admin@123).
    Skip or use only in integration tests when TEST_DATABASE_URL is set.
    """
    r = client.post(
        "/auth/login",
        json={"email": "admin@gamehub.local", "password": "Admin@123"},
    )
    if r.status_code != 200:
        return {}
    data = r.json().get("data", {})
    token = data.get("access_token")
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}
