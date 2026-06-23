"""
Customer model for tenant (walk-in or registered customers).
"""
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.customer_account import CustomerAccountEntry


class Customer(Base, TimestampMixin, TenantMixin):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    mobile: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    account_entries: Mapped[list["CustomerAccountEntry"]] = relationship(
        "CustomerAccountEntry", back_populates="customer"
    )

    def __repr__(self) -> str:
        return f"<Customer id={self.id} name={self.name}>"
