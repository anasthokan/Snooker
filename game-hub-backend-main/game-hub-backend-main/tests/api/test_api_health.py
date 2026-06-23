"""
API tests: health and docs.
Per documentation: API Tests.
"""
import pytest
from fastapi.testclient import TestClient


def test_health_returns_200(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_docs_returns_200(client: TestClient):
    r = client.get("/docs")
    assert r.status_code == 200


def test_redoc_returns_200(client: TestClient):
    r = client.get("/redoc")
    assert r.status_code == 200
