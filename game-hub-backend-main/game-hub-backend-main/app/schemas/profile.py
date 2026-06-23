"""
Profile schemas: current user + tenant branding.
"""
from datetime import datetime
from pydantic import BaseModel, field_validator


class ProfileResponse(BaseModel):
    id: int
    email: str
    role_name: str
    tenant_id: int
    tenant_name: str | None
    is_active: bool
    profile_picture_url: str | None
    tenant_vat_no: str | None
    tenant_cr_no: str | None
    tenant_logo_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdateRequest(BaseModel):
    """All fields optional: update only what is sent (email, password, or profile picture URL)."""
    email: str | None = None
    current_password: str | None = None
    new_password: str | None = None
    profile_picture_url: str | None = None

    @field_validator("email")
    @classmethod
    def email_trim(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        s = v.strip().lower()
        if "@" not in s or s.count("@") != 1:
            raise ValueError("Enter a valid email address")
        return s

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class TenantBrandingUpdateRequest(BaseModel):
    vat_no: str | None = None
    cr_no: str | None = None
    invoice_logo_url: str | None = None

    @staticmethod
    def _normalize_str_field(v: str | None) -> str | None:
        """Treat JSON \"null\" or empty string as None; coerce other types to str."""
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            if s.lower() in ("null", ""):
                return None
            return s
        # Coerce numbers, etc. to string so we don't get 422
        return str(v)

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if isinstance(obj, dict):
            obj = {
                **obj,
                "vat_no": cls._normalize_str_field(obj.get("vat_no")),
                "cr_no": cls._normalize_str_field(obj.get("cr_no")),
                "invoice_logo_url": cls._normalize_str_field(obj.get("invoice_logo_url")),
            }
        return super().model_validate(obj, **kwargs)

