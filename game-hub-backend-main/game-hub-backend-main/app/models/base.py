"""
Base model and mixins for common fields.
"""
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, declared_attr

from app.core.database import Base as DeclarativeBase


class TimestampMixin:
    """created_at and updated_at columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class TenantMixin:
    """Adds tenant_id for multi-tenant isolation."""

    @declared_attr.directive
    def tenant_id(cls) -> Mapped[int]:
        return mapped_column("tenant_id", ForeignKey("tenants.id"), nullable=False, index=True)


class Base(DeclarativeBase):
    """Base for all models with id."""

    __abstract__ = True

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
