"""
CanteenBill and CanteenBillItem models for walk-in canteen orders (no session/player).
"""
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin


class CanteenBill(Base, TimestampMixin, TenantMixin):
    """Walk-in canteen bill (customer not in a game session)."""

    __tablename__ = "canteen_bills"

    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_mobile: Mapped[str | None] = mapped_column(String(50), nullable=True)

    items: Mapped[list["CanteenBillItem"]] = relationship(
        "CanteenBillItem",
        back_populates="bill",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<CanteenBill id={self.id} customer={self.customer_name}>"


class CanteenBillItem(Base, TimestampMixin):
    """Line item in a walk-in canteen bill."""

    __tablename__ = "canteen_bill_items"

    canteen_bill_id: Mapped[int] = mapped_column(
        ForeignKey("canteen_bills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    bill: Mapped["CanteenBill"] = relationship("CanteenBill", back_populates="items")

    def __repr__(self) -> str:
        return f"<CanteenBillItem id={self.id} bill_id={self.canteen_bill_id}>"
