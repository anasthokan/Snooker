"""
Customer account ledger: debit (bill on credit) and credit (settlement payment).
"""
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.session import Session


class CustomerAccountEntry(Base, TimestampMixin, TenantMixin):
    __tablename__ = "customer_account_entries"

    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    session_id: Mapped[int | None] = mapped_column(ForeignKey("sessions.id"), nullable=True, index=True)
    entry_type: Mapped[str] = mapped_column(String(20), nullable=False)  # debit | credit
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    customer: Mapped["Customer"] = relationship("Customer", back_populates="account_entries")
    session: Mapped["Session | None"] = relationship("Session")

    def __repr__(self) -> str:
        return f"<CustomerAccountEntry id={self.id} type={self.entry_type} amount={self.amount}>"
