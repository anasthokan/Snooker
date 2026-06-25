"""Add repayments table for outgoing business payments.

Revision ID: 010_repayments
Revises: 009_customer_auth
Create Date: 2026-06-25

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "010_repayments"
down_revision: Union[str, None] = "009_customer_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "repayments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("paid_at", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_repayments_tenant_id"), "repayments", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_repayments_category"), "repayments", ["category"], unique=False)
    op.create_index(op.f("ix_repayments_paid_at"), "repayments", ["paid_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_repayments_paid_at"), table_name="repayments")
    op.drop_index(op.f("ix_repayments_category"), table_name="repayments")
    op.drop_index(op.f("ix_repayments_tenant_id"), table_name="repayments")
    op.drop_table("repayments")
