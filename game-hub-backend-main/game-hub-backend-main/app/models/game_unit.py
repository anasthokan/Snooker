"""
GameUnit model (individual seat/console per game type).
"""
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.game_type import GameType
    from app.models.session import Session


class GameUnit(Base, TimestampMixin, TenantMixin):
    __tablename__ = "gameunits"

    game_type_id: Mapped[int] = mapped_column(ForeignKey("gametypes.id"), nullable=False, index=True)
    unit_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    weekday_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    weekend_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    special_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")

    game_type: Mapped["GameType"] = relationship("GameType", back_populates="game_units")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="game_unit", lazy="selectin")

    def __repr__(self) -> str:
        return f"<GameUnit id={self.id} unit_name={self.unit_name}>"
