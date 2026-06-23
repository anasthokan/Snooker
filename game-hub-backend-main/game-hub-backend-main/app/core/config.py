"""
Application configuration using environment variables.
"""
from functools import lru_cache
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root = folder containing 'app' (gamehub-backend)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "GameHub Pro API"
    debug: bool = False

    # Database: use DATABASE_URL, or build from parts (avoids password encoding issues)
    database_url: Optional[str] = None
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "gamehub"
    db_user: str = "postgres"
    db_password: str = "postgres"
    db_echo: bool = False
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # JWT
    jwt_secret_key: str = "change-me-in-production-use-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    # Security
    bcrypt_rounds: int = 12

    # CORS (for React frontend)
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Billing / invoices
    bill_verification_base_url: Optional[str] = None
    invoice_default_logo_path: Optional[str] = None

    # Uploads (tenant logo, profile picture) – stored under project, served at /static/uploads
    upload_dir: Optional[str] = None  # default: project_root / "uploads"
    max_upload_size_mb: int = 5
    allowed_upload_extensions: str = "image/jpeg,image/png,image/gif,image/webp"

    # Moyasar payment gateway (SAR)
    moyasar_publishable_key: Optional[str] = None
    moyasar_secret_key: Optional[str] = None
    public_app_url: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


def get_database_url() -> str:
    """Return database URL for Alembic (sync). Uses DATABASE_URL or builds from DB_* vars."""
    s = get_settings()
    if s.database_url:
        return s.database_url
    # Build URL from parts; encode user/password for special chars like @
    user = quote_plus(s.db_user)
    password = quote_plus(s.db_password)
    return f"postgresql://{user}:{password}@{s.db_host}:{s.db_port}/{s.db_name}"
