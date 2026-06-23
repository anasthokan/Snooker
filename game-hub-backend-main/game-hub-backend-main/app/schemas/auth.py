"""
Auth request/response schemas.
"""
from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    """Login accepts any string that looks like an email (e.g. admin@gamehub.local for dev)."""
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_looks_valid(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not v or "@" not in v or v.count("@") != 1:
            raise ValueError("Enter a valid email address")
        return v


class TokenPayload(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
