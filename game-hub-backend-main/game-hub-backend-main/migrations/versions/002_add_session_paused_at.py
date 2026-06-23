"""Add paused_at to sessions for pause/resume timing.

Revision ID: 002_paused_at
Revises: 001_initial
Create Date: 2025-02-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_paused_at"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("paused_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("sessions", "paused_at")
