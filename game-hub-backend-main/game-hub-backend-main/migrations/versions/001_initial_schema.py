"""Initial schema: tenants, roles, users, gametypes, gameunits, sessions, session_players, products, player_orders, payments.

Revision ID: 001_initial
Revises:
Create Date: 2025-02-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    op.create_table(
        "tenants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("subscription_plan", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tenants_name", "tenants", ["name"], unique=False)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("ix_users_role_id", "users", ["role_id"], unique=False)
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"], unique=False)

    op.create_table(
        "gametypes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("billing_type", sa.String(50), nullable=False),
        sa.Column("icon", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_gametypes_name", "gametypes", ["name"], unique=False)
    op.create_index("ix_gametypes_tenant_id", "gametypes", ["tenant_id"], unique=False)

    op.create_table(
        "gameunits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("game_type_id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("unit_name", sa.String(100), nullable=False),
        sa.Column("weekday_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("weekend_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("special_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["game_type_id"], ["gametypes.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_gameunits_game_type_id", "gameunits", ["game_type_id"], unique=False)
    op.create_index("ix_gameunits_unit_name", "gameunits", ["unit_name"], unique=False)
    op.create_index("ix_gameunits_tenant_id", "gameunits", ["tenant_id"], unique=False)

    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("game_type_id", sa.Integer(), nullable=False),
        sa.Column("game_unit_id", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paused_seconds", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("total_charge", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["game_type_id"], ["gametypes.id"]),
        sa.ForeignKeyConstraint(["game_unit_id"], ["gameunits.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sessions_game_type_id", "sessions", ["game_type_id"], unique=False)
    op.create_index("ix_sessions_game_unit_id", "sessions", ["game_unit_id"], unique=False)
    op.create_index("ix_sessions_status", "sessions", ["status"], unique=False)
    op.create_index("ix_sessions_tenant_id", "sessions", ["tenant_id"], unique=False)

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_products_name", "products", ["name"], unique=False)
    op.create_index("ix_products_tenant_id", "products", ["tenant_id"], unique=False)

    op.create_table(
        "session_players",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("mobile", sa.String(50), nullable=True),
        sa.Column("membership_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_session_players_session_id", "session_players", ["session_id"], unique=False)

    op.create_table(
        "player_orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["player_id"], ["session_players.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_player_orders_player_id", "player_orders", ["player_id"], unique=False)
    op.create_index("ix_player_orders_product_id", "player_orders", ["product_id"], unique=False)
    op.create_index("ix_player_orders_session_id", "player_orders", ["session_id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("method", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payments_session_id", "payments", ["session_id"], unique=False)

    # Seed roles
    op.execute(
        sa.text("""
            INSERT INTO roles (name, created_at, updated_at)
            VALUES
                ('SUPER_ADMIN', NOW(), NOW()),
                ('TENANT_ADMIN', NOW(), NOW()),
                ('MANAGER', NOW(), NOW()),
                ('CASHIER', NOW(), NOW())
        """)
    )


def downgrade() -> None:
    op.drop_index("ix_payments_session_id", "payments")
    op.drop_table("payments")
    op.drop_index("ix_player_orders_session_id", "player_orders")
    op.drop_index("ix_player_orders_product_id", "player_orders")
    op.drop_index("ix_player_orders_player_id", "player_orders")
    op.drop_table("player_orders")
    op.drop_index("ix_session_players_session_id", "session_players")
    op.drop_table("session_players")
    op.drop_index("ix_products_tenant_id", "products")
    op.drop_index("ix_products_name", "products")
    op.drop_table("products")
    op.drop_index("ix_sessions_tenant_id", "sessions")
    op.drop_index("ix_sessions_status", "sessions")
    op.drop_index("ix_sessions_game_unit_id", "sessions")
    op.drop_index("ix_sessions_game_type_id", "sessions")
    op.drop_table("sessions")
    op.drop_index("ix_gameunits_tenant_id", "gameunits")
    op.drop_index("ix_gameunits_unit_name", "gameunits")
    op.drop_index("ix_gameunits_game_type_id", "gameunits")
    op.drop_table("gameunits")
    op.drop_index("ix_gametypes_tenant_id", "gametypes")
    op.drop_index("ix_gametypes_name", "gametypes")
    op.drop_table("gametypes")
    op.drop_index("ix_users_tenant_id", "users")
    op.drop_index("ix_users_role_id", "users")
    op.drop_index("ix_users_email", "users")
    op.drop_table("users")
    op.drop_index("ix_tenants_name", "tenants")
    op.drop_table("tenants")
    op.drop_index("ix_roles_name", "roles")
    op.drop_table("roles")
