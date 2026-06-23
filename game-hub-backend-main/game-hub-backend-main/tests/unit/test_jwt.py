"""
Unit tests: JWT create and decode.
Per documentation: Unit Tests.
"""
import pytest

from app.core.jwt import create_access_token, create_refresh_token, decode_token


def test_create_access_token_returns_string():
    token = create_access_token(subject=1, tenant_id=10, role="CASHIER")
    assert isinstance(token, str)
    assert len(token) > 0


def test_decode_token_valid_access():
    token = create_access_token(subject=42, tenant_id=1, role="MANAGER")
    payload = decode_token(token)
    assert payload is not None
    assert payload.get("sub") == "42"
    assert payload.get("tenant_id") == 1
    assert payload.get("role") == "MANAGER"
    assert payload.get("type") == "access"
    assert "exp" in payload


def test_decode_token_invalid_returns_none():
    assert decode_token("invalid.jwt.token") is None
    assert decode_token("") is None


def test_create_refresh_token_returns_string():
    token = create_refresh_token(subject=1)
    assert isinstance(token, str)
    assert len(token) > 0


def test_decode_refresh_token():
    token = create_refresh_token(subject=99)
    payload = decode_token(token)
    assert payload is not None
    assert payload.get("sub") == "99"
    assert payload.get("type") == "refresh"
