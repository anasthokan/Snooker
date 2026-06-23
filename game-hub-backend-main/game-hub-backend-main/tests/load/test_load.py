"""
Load tests. Per documentation: Load Tests.
Performance target: API response < 300ms (documentation).
"""
import pytest
from fastapi.testclient import TestClient

# Number of requests for load test
LOAD_REQUESTS = 50


def test_load_health_endpoint(client: TestClient):
    """Run multiple requests to /health; all must succeed."""
    for _ in range(LOAD_REQUESTS):
        r = client.get("/health")
        assert r.status_code == 200, "All health requests must return 200"
        assert r.json().get("status") == "ok"


def test_load_health_response_time(client: TestClient):
    """Per documentation: API response < 300ms."""
    import time
    times = []
    for _ in range(20):
        start = time.perf_counter()
        r = client.get("/health")
        elapsed_ms = (time.perf_counter() - start) * 1000
        times.append(elapsed_ms)
        assert r.status_code == 200
    avg_ms = sum(times) / len(times)
    assert avg_ms < 300, f"Average response time {avg_ms:.1f}ms should be < 300ms (doc: PERFORMANCE TARGETS)"
