"""Add canteen_bills and canteen_bill_items for walk-in orders.

Revision ID: 005_canteen_bill
Revises: 004_tenant_branding_profile
Create Date: 2026-03-05

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "005_canteen_bill"
down_revision: Union[str, None] = "004_tenant_branding_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "canteen_bills",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("customer_name", sa.String(length=255), nullable=False),
        sa.Column("customer_mobile", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_canteen_bills_tenant_id"), "canteen_bills", ["tenant_id"], unique=False)

    op.create_table(
        "canteen_bill_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("canteen_bill_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["canteen_bill_id"], ["canteen_bills.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_canteen_bill_items_canteen_bill_id"), "canteen_bill_items", ["canteen_bill_id"], unique=False)
    op.create_index(op.f("ix_canteen_bill_items_product_id"), "canteen_bill_items", ["product_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_canteen_bill_items_product_id"), table_name="canteen_bill_items")
    op.drop_index(op.f("ix_canteen_bill_items_canteen_bill_id"), table_name="canteen_bill_items")
    op.drop_table("canteen_bill_items")
    op.drop_index(op.f("ix_canteen_bills_tenant_id"), table_name="canteen_bills")
    op.drop_table("canteen_bills")
