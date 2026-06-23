"""
Product model for canteen/orders (referenced by PlayerOrder.product_id).
"""
from decimal import Decimal

from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin


class Product(Base, TimestampMixin, TenantMixin):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name}>"
