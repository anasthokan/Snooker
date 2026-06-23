"""
Online gateway payment records (Moyasar).
"""
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.session import Session


class GatewayPayment(Base, TimestampMixin, TenantMixin):
    __tablename__ = "gateway_payments"
    __table_args__ = (UniqueConstraint("moyasar_payment_id", name="uq_gateway_moyasar_payment_id"),)

    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True, index=True)
    session_id: Mapped[int | None] = mapped_column(ForeignKey("sessions.id"), nullable=True, index=True)
    moyasar_payment_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="SAR")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    purpose: Mapped[str] = mapped_column(String(50), nullable=False)  # account_settlement | session

    customer: Mapped["Customer | None"] = relationship("Customer")
    session: Mapped["Session | None"] = relationship("Session")

    def __repr__(self) -> str:
        return f"<GatewayPayment id={self.id} moyasar={self.moyasar_payment_id} status={self.status}>"
