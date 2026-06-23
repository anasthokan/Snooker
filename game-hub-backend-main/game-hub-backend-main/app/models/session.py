"""
Session and SessionPlayer models for game sessions.
"""
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.game_type import GameType
    from app.models.game_unit import GameUnit
    from app.models.order import PlayerOrder
    from app.models.payment import Payment


class Session(Base, TimestampMixin, TenantMixin):
    __tablename__ = "sessions"

    game_type_id: Mapped[int] = mapped_column(ForeignKey("gametypes.id"), nullable=False, index=True)
    game_unit_id: Mapped[int] = mapped_column(ForeignKey("gameunits.id"), nullable=False, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paused_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    paused_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # when current pause started
    status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # active, paused, ended
    total_charge: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    game_type: Mapped["GameType"] = relationship("GameType", back_populates="sessions")
    game_unit: Mapped["GameUnit"] = relationship("GameUnit", back_populates="sessions")
    players: Mapped[list["SessionPlayer"]] = relationship(
        "SessionPlayer", back_populates="session", lazy="selectin", cascade="all, delete-orphan"
    )
    orders: Mapped[list["PlayerOrder"]] = relationship(
        "PlayerOrder", back_populates="session", lazy="selectin", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="session", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Session id={self.id} status={self.status}>"


class SessionPlayer(Base, TimestampMixin):
    __tablename__ = "session_players"

    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    mobile: Mapped[str | None] = mapped_column(String(50), nullable=True)
    membership_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    session: Mapped["Session"] = relationship("Session", back_populates="players")
    orders: Mapped[list["PlayerOrder"]] = relationship(
        "PlayerOrder", back_populates="player", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<SessionPlayer id={self.id} name={self.name}>"
