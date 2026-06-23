"""Add customer account ledger entries.

Revision ID: 007_customer_account
Revises: 006_customer
Create Date: 2026-06-22

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "007_customer_account"
down_revision: Union[str, None] = "006_customer"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "customer_account_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=True),
        sa.Column("entry_type", sa.String(length=20), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_customer_account_entries_tenant_id"),
        "customer_account_entries",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_customer_account_entries_customer_id"),
        "customer_account_entries",
        ["customer_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_customer_account_entries_session_id"),
        "customer_account_entries",
        ["session_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_customer_account_entries_session_id"), table_name="customer_account_entries")
    op.drop_index(op.f("ix_customer_account_entries_customer_id"), table_name="customer_account_entries")
    op.drop_index(op.f("ix_customer_account_entries_tenant_id"), table_name="customer_account_entries")
    op.drop_table("customer_account_entries")
