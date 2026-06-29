"""Add Stripe subscription fields to tenants.

Revision ID: 011_tenant_stripe
Revises: 010_repayments
Create Date: 2026-06-29

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "011_tenant_stripe"
down_revision: Union[str, None] = "010_repayments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("billing_country", sa.String(length=2), nullable=True))
    op.add_column("tenants", sa.Column("stripe_customer_id", sa.String(length=255), nullable=True))
    op.add_column("tenants", sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True))
    op.add_column("tenants", sa.Column("subscription_status", sa.String(length=50), nullable=True))
    op.create_index("ix_tenants_stripe_customer_id", "tenants", ["stripe_customer_id"], unique=False)
    op.create_index("ix_tenants_stripe_subscription_id", "tenants", ["stripe_subscription_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_tenants_stripe_subscription_id", table_name="tenants")
    op.drop_index("ix_tenants_stripe_customer_id", table_name="tenants")
    op.drop_column("tenants", "subscription_status")
    op.drop_column("tenants", "stripe_subscription_id")
    op.drop_column("tenants", "stripe_customer_id")
    op.drop_column("tenants", "billing_country")
