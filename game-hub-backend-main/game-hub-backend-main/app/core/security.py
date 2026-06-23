"""
Password hashing and verification using bcrypt.
"""
import bcrypt

from app.core.config import get_settings

settings = get_settings()


def hash_password(plain_password: str) -> str:
    """Hash a plain text password."""
    salt = bcrypt.gensalt(rounds=settings.bcrypt_rounds)
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )
