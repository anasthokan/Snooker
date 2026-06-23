"""
GameType model (e.g. PC, PlayStation, Xbox).
"""
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin


class GameType(Base, TimestampMixin, TenantMixin):
    __tablename__ = "gametypes"

    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    billing_type: Mapped[str] = mapped_column(String(50), nullable=False)  # hourly, per_session, etc.
    icon: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")

    game_units: Mapped[list["GameUnit"]] = relationship(
        "GameUnit", back_populates="game_type", lazy="selectin"
    )
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="game_type", lazy="selectin")

    def __repr__(self) -> str:
        return f"<GameType id={self.id} name={self.name}>"
