"""Add tenant branding fields and user profile picture.

Revision ID: 004_tenant_branding_profile
Revises: 003_reset_category
Create Date: 2026-03-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "004_tenant_branding_profile"
down_revision: Union[str, None] = "003_reset_category"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("vat_no", sa.String(length=100), nullable=True))
    op.add_column("tenants", sa.Column("cr_no", sa.String(length=100), nullable=True))
    op.add_column(
        "tenants",
        sa.Column("invoice_logo_url", sa.String(length=255), nullable=True),
    )

    op.add_column(
        "users",
        sa.Column("profile_picture_url", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "profile_picture_url")
    op.drop_column("tenants", "invoice_logo_url")
    op.drop_column("tenants", "cr_no")
    op.drop_column("tenants", "vat_no")

