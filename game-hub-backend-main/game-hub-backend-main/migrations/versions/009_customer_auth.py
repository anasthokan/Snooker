"""Add customer login fields (password_hash, is_active).

Revision ID: 009_customer_auth
Revises: 008_gateway_payment
Create Date: 2026-06-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "009_customer_auth"
down_revision: Union[str, None] = "008_gateway_payment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("customers", sa.Column("password_hash", sa.String(length=255), nullable=True))
    op.add_column(
        "customers",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade() -> None:
    op.drop_column("customers", "is_active")
    op.drop_column("customers", "password_hash")
