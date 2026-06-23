"""
User model. Tied to a tenant and role.
"""
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.role import Role
    from app.models.tenant import Tenant


class User(Base, TimestampMixin, TenantMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    profile_picture_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    role: Mapped["Role"] = relationship("Role", back_populates="users")
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
