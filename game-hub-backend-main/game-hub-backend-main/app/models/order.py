"""
PlayerOrder model (canteen orders per session/player).
"""
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.session import Session, SessionPlayer


class PlayerOrder(Base, TimestampMixin):
    __tablename__ = "player_orders"

    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("session_players.id"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    session: Mapped["Session"] = relationship("Session", back_populates="orders")
    player: Mapped["SessionPlayer"] = relationship("SessionPlayer", back_populates="orders")

    def __repr__(self) -> str:
        return f"<PlayerOrder id={self.id} session_id={self.session_id}>"
