"""
Unit tests: password hashing and verification.
Per documentation: Unit Tests.
"""
import pytest

from app.core.security import hash_password, verify_password


def test_hash_password_returns_non_empty_string():
    plain = "mySecretPass123"
    hashed = hash_password(plain)
    assert isinstance(hashed, str)
    assert len(hashed) > 0
    assert hashed != plain


def test_hash_password_different_each_time():
    plain = "samePassword"
    h1 = hash_password(plain)
    h2 = hash_password(plain)
    assert h1 != h2  # bcrypt uses salt


def test_verify_password_correct():
    plain = "correctPassword"
    hashed = hash_password(plain)
    assert verify_password(plain, hashed) is True


def test_verify_password_incorrect():
    hashed = hash_password("realPassword")
    assert verify_password("wrongPassword", hashed) is False


def test_verify_password_empty_wrong():
    hashed = hash_password("something")
    assert verify_password("", hashed) is False
