"""
Save tenant logo and profile picture uploads; return URL path for DB.
Files are stored under uploads/ and served at /static/uploads/.
"""
import re
import secrets
from pathlib import Path

from fastapi import UploadFile, HTTPException, status

from app.core.config import get_settings

# URL path prefix for stored files (no leading slash; mount is /static/uploads)
STATIC_UPLOAD_PREFIX = "/static/uploads"

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
_EXT_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


def get_upload_root() -> Path:
    """Upload directory (used by main to mount static files)."""
    s = get_settings()
    if s.upload_dir:
        return Path(s.upload_dir)
    return Path(__file__).resolve().parent.parent.parent / "uploads"


def _upload_root() -> Path:
    return get_upload_root()


def _safe_filename(original: str) -> str:
    """Keep only safe chars; limit length."""
    base = Path(original).stem if original else "file"
    base = re.sub(r"[^\w\-]", "", base)[:50]
    return base or "file"


def _check_file(file: UploadFile, max_size_mb: int) -> None:
    s = get_settings()
    max_bytes = (max_size_mb or s.max_upload_size_mb) * 1024 * 1024
    content_type = (file.content_type or "").strip().lower()
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(_ALLOWED_CONTENT_TYPES)}",
        )
    # Size: read and check (optional; for very large files you might stream)
    body = file.file.read()
    file.file.seek(0)
    if len(body) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max {max_size_mb} MB.",
        )


def save_tenant_logo(file: UploadFile, tenant_id: int) -> str:
    """
    Save uploaded image under uploads/tenants/{tenant_id}/ and return URL path.
    Path is like /static/uploads/tenants/13/logo_abc123.png (for use in DB and responses).
    """
    _check_file(file, get_settings().max_upload_size_mb)
    root = _upload_root()
    dir_path = root / "tenants" / str(tenant_id)
    dir_path.mkdir(parents=True, exist_ok=True)
    content_type = (file.content_type or "image/png").strip().lower()
    ext = _EXT_BY_TYPE.get(content_type, ".png")
    name = _safe_filename(file.filename or "logo") + "_" + secrets.token_hex(4) + ext
    path = dir_path / name
    path.write_bytes(file.file.read())
    # Return URL path (no host; frontend/PDF can use request.base_url + this)
    return f"{STATIC_UPLOAD_PREFIX}/tenants/{tenant_id}/{name}"


def save_profile_picture(file: UploadFile, user_id: int) -> str:
    """
    Save uploaded image under uploads/users/{user_id}/ and return URL path.
    """
    _check_file(file, get_settings().max_upload_size_mb)
    root = _upload_root()
    dir_path = root / "users" / str(user_id)
    dir_path.mkdir(parents=True, exist_ok=True)
    content_type = (file.content_type or "image/png").strip().lower()
    ext = _EXT_BY_TYPE.get(content_type, ".png")
    name = _safe_filename(file.filename or "avatar") + "_" + secrets.token_hex(4) + ext
    path = dir_path / name
    path.write_bytes(file.file.read())
    return f"{STATIC_UPLOAD_PREFIX}/users/{user_id}/{name}"
