"""
Auth API: login, refresh, logout, forgot password, reset password.
"""
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import TokenPayload, RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.common import SuccessResponse, ErrorResponse
from app.services.auth_service import (
    authenticate_user,
    authenticate_user_login_error,
    create_tokens_for_user,
    validate_refresh_token,
    request_password_reset,
    reset_password_with_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

ROLE_FEATURES = {
    "SUPER_ADMIN": {"dashboard": True, "reports": True, "role_management": True},
    "TENANT_ADMIN": {"dashboard": True, "reports": True, "role_management": True},
    "MANAGER": {"dashboard": True, "reports": True, "role_management": False},
    "CASHIER": {"dashboard": True, "reports": True, "role_management": False},
}


@router.get("/features", response_model=SuccessResponse[dict])
def get_features(current_user: User = Depends(get_current_user)):
    """Return UI feature flags for the current user's role."""
    role_name = current_user.role.name if current_user.role else None
    features = ROLE_FEATURES.get(
        role_name,
        {"dashboard": True, "reports": False, "role_management": False},
    )
    return SuccessResponse(data=features, message="OK")


@router.post(
    "/login",
    response_model=SuccessResponse[TokenPayload],
    responses={401: {"model": ErrorResponse, "description": "Invalid credentials"}},
)
def login(
    email: str = Body(..., embed=True, description="Email (e.g. admin@gamehub.local)"),
    password: str = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    """Authenticate with email and password; returns access and refresh tokens."""
    login_error = authenticate_user_login_error(db, email.strip().lower(), password)
    if login_error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=login_error,
        )
    user = authenticate_user(db, email.strip().lower(), password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    tokens = create_tokens_for_user(user)
    return SuccessResponse(data=tokens, message="Login successful")


@router.post(
    "/refresh",
    response_model=SuccessResponse[TokenPayload],
    responses={401: {"model": ErrorResponse, "description": "Invalid refresh token"}},
)
def refresh(
    body: RefreshRequest,
    db: Session = Depends(get_db),
):
    """Issue new access (and optionally refresh) token using refresh token."""
    user = validate_refresh_token(db, body.refresh_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    tokens = create_tokens_for_user(user)
    return SuccessResponse(data=tokens, message="Token refreshed")


@router.post("/logout", response_model=SuccessResponse[dict])
def logout():
    """
    Logout. Client should discard stored tokens.
    (Stateless JWT: no server-side revoke unless we add a blocklist; document for client.)
    """
    return SuccessResponse(data={}, message="Logged out successfully")


@router.post("/forgot-password", response_model=SuccessResponse[dict])
def forgot_password(
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Request a password reset. If email exists, a token is created. In DEBUG mode, token is returned."""
    token = request_password_reset(db, body.email)
    data = {}
    if token and settings.debug:
        data["reset_token"] = token
    return SuccessResponse(
        data=data,
        message="If the email is registered, a reset link has been sent. Check your email or (if DEBUG) use the token.",
    )


@router.post("/reset-password", response_model=SuccessResponse[dict])
def reset_password(
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset password using the token from forgot-password. Minimum 6 characters."""
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    ok = reset_password_with_token(db, body.token, body.new_password)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token",
        )
    return SuccessResponse(data={}, message="Password reset successful")
