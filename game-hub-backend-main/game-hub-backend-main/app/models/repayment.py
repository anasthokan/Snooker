"""
Repayment model: outgoing business payments (rent, electricity, salary, etc.).
"""
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin

REPAYMENT_CATEGORIES = (
    "electricity",
    "rent",
    "salary",
    "maintenance",
    "other",
)


class Repayment(Base, TimestampMixin, TenantMixin):
    __tablename__ = "repayments"

    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_at: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<Repayment id={self.id} category={self.category} amount={self.amount}>"
