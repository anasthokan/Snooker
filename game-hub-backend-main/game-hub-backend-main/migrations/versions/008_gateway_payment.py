"""Add gateway payments table for Moyasar.

Revision ID: 008_gateway_payment
Revises: 007_customer_account
Create Date: 2026-06-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "008_gateway_payment"
down_revision: Union[str, None] = "007_customer_account"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "gateway_payments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=True),
        sa.Column("session_id", sa.Integer(), nullable=True),
        sa.Column("moyasar_payment_id", sa.String(length=100), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="SAR"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("purpose", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("moyasar_payment_id", name="uq_gateway_moyasar_payment_id"),
    )
    op.create_index(op.f("ix_gateway_payments_tenant_id"), "gateway_payments", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_gateway_payments_customer_id"), "gateway_payments", ["customer_id"], unique=False)
    op.create_index(op.f("ix_gateway_payments_session_id"), "gateway_payments", ["session_id"], unique=False)
    op.create_index(op.f("ix_gateway_payments_moyasar_payment_id"), "gateway_payments", ["moyasar_payment_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_gateway_payments_moyasar_payment_id"), table_name="gateway_payments")
    op.drop_index(op.f("ix_gateway_payments_session_id"), table_name="gateway_payments")
    op.drop_index(op.f("ix_gateway_payments_customer_id"), table_name="gateway_payments")
    op.drop_index(op.f("ix_gateway_payments_tenant_id"), table_name="gateway_payments")
    op.drop_table("gateway_payments")
