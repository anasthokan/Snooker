"""
Payment model for session payments.
"""
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.session import Session


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(50), nullable=False)  # cash, card, split, etc.
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="completed")

    session: Mapped["Session"] = relationship("Session", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment id={self.id} amount={self.amount}>"
