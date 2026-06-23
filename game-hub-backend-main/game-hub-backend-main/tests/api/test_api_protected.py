"""
API tests: protected endpoints return 401 without valid token.
Per documentation: API Tests.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.parametrize("method,url", [
    ("GET", "/games/types"),
    ("GET", "/games/units"),
    ("POST", "/sessions/start"),
    ("GET", "/orders/session/1"),
    ("POST", "/billing/calculate"),
    ("GET", "/reports/revenue"),
    ("GET", "/ai/sessions"),
])
def test_protected_endpoint_requires_auth(client: TestClient, method: str, url: str):
    if method == "GET":
        r = client.get(url)
    else:
        r = client.post(url, json={})
    assert r.status_code == 401, f"{method} {url} should require auth"
