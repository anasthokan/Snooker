"""
Authentication service: login, refresh, user resolution, forgot/reset password.
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.jwt import create_access_token, create_refresh_token, decode_token
from app.core.security import verify_password, hash_password
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.schemas.auth import TokenPayload

logger = logging.getLogger(__name__)
settings = get_settings()
RESET_TOKEN_EXPIRE_HOURS = 1
SUPER_ADMIN_ROLE = "SUPER_ADMIN"


def is_user_access_allowed(user: User) -> bool:
    """Staff login/API access: active user; tenant must be active unless super admin."""
    if not user.is_active:
        return False
    role_name = user.role.name if user.role else None
    if role_name == SUPER_ADMIN_ROLE:
        return True
    tenant = user.tenant
    if not tenant or tenant.status != "active":
        return False
    return True


def _load_user_by_email(db: Session, email_clean: str) -> Optional[User]:
    from sqlalchemy.orm import selectinload

    return (
        db.query(User)
        .options(selectinload(User.role), selectinload(User.tenant))
        .filter(func.lower(User.email) == email_clean)
        .first()
    )


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Verify credentials and return user or None. Email lookup is case-insensitive."""
    email_clean = (email or "").strip().lower()
    if not email_clean:
        return None
    user = _load_user_by_email(db, email_clean)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not is_user_access_allowed(user):
        return None
    return user


def authenticate_user_login_error(db: Session, email: str, password: str) -> str | None:
    """Return a user-facing login error, or None if credentials are invalid."""
    email_clean = (email or "").strip().lower()
    if not email_clean:
        return None
    user = _load_user_by_email(db, email_clean)
    if not user or not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return "Your user account is disabled."
    if not is_user_access_allowed(user):
        return "This parlour has been deactivated. Contact the platform administrator."
    return None


def create_tokens_for_user(user: User) -> TokenPayload:
    """Create access and refresh tokens for a user."""
    role = user.role.name if user.role else None
    access = create_access_token(
        subject=user.id,
        tenant_id=user.tenant_id,
        role=role,
    )
    refresh = create_refresh_token(user.id)
    return TokenPayload(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by id (for refresh token and current user). Loads role and tenant."""
    from sqlalchemy.orm import selectinload
    return (
        db.query(User)
        .options(selectinload(User.role), selectinload(User.tenant))
        .filter(User.id == user_id)
        .first()
    )


def validate_refresh_token(db: Session, refresh_token: str) -> Optional[User]:
    """Decode refresh token and return user if valid."""
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        return None
    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError):
        return None
    user = get_user_by_id(db, user_id)
    if not user or not is_user_access_allowed(user):
        return None
    return user


def request_password_reset(db: Session, email: str) -> Optional[str]:
    """
    Create a password reset token for the user. Returns the token string if user exists;
    returns None if no user. Caller can return token in response (e.g. for testing) or send via email.
    """
    email_clean = (email or "").strip().lower()
    if not email_clean:
        return None
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if not user:
        return None
    # Invalidate any existing tokens for this user
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
    pr = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
    db.add(pr)
    db.commit()
    logger.info("Password reset token created for user_id=%s", user.id)
    return token


def reset_password_with_token(db: Session, token: str, new_password: str) -> bool:
    """Reset user password using token. Returns True if success, False if invalid/expired."""
    if not token or not new_password or len(new_password) < 6:
        return False
    pr = db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()
    if not pr:
        return False
    if pr.expires_at < datetime.now(timezone.utc):
        db.delete(pr)
        db.commit()
        return False
    user = db.query(User).filter(User.id == pr.user_id).first()
    if not user:
        db.delete(pr)
        db.commit()
        return False
    user.password_hash = hash_password(new_password)
    db.delete(pr)
    db.commit()
    logger.info("Password reset completed for user_id=%s", user.id)
    return True
