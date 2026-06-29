"""
Tenant (gaming center / shop) model.
"""
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")  # active, suspended, etc.
    subscription_plan: Mapped[str | None] = mapped_column(String(100), nullable=True)
    billing_country: Mapped[str | None] = mapped_column(String(2), nullable=True)  # SA, IN
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    subscription_status: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Branding fields for invoices/profile per tenant.
    vat_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cr_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    invoice_logo_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    users: Mapped[list["User"]] = relationship("User", back_populates="tenant", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Tenant id={self.id} name={self.name}>"
