"""
Role model for RBAC.
"""
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    users: Mapped[list["User"]] = relationship("User", back_populates="role", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Role id={self.id} name={self.name}>"
