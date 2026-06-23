"""Add customers table.

Revision ID: 006_customer
Revises: 005_canteen_bill
Create Date: 2026-03-06

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "006_customer"
down_revision: Union[str, None] = "005_canteen_bill"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("mobile", sa.String(length=50), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_customers_tenant_id"), "customers", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_customers_name"), "customers", ["name"], unique=False)
    op.create_index(op.f("ix_customers_mobile"), "customers", ["mobile"], unique=False)
    op.create_index(op.f("ix_customers_email"), "customers", ["email"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_customers_email"), table_name="customers")
    op.drop_index(op.f("ix_customers_mobile"), table_name="customers")
    op.drop_index(op.f("ix_customers_name"), table_name="customers")
    op.drop_index(op.f("ix_customers_tenant_id"), table_name="customers")
    op.drop_table("customers")
