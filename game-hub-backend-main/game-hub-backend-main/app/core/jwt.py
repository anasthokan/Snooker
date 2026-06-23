"""
JWT token creation and validation.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()


def create_access_token(
    subject: Any,
    tenant_id: Optional[int] = None,
    role: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
    subject_type: str = "user",
) -> str:
    """Create JWT access token. subject is typically user_id or customer_id."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "type": "access",
        "sub_type": subject_type,
    }
    if tenant_id is not None:
        to_encode["tenant_id"] = tenant_id
    if role is not None:
        to_encode["role"] = role
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: Any, subject_type: str = "user") -> str:
    """Create JWT refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "type": "refresh",
        "sub_type": subject_type,
    }
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[dict[str, Any]]:
    """Decode and validate JWT. Returns payload or None on invalid/expired."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError:
        return None
