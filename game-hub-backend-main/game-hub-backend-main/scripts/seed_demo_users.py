"""
Seed demo users for local testing.
Usage: python -m scripts.seed_demo_users [--force]
  --force: reset password if user already exists.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User

USERS = [
    ("Super_Admin@gamehub.local", "Test@123", "SUPER_ADMIN", None),
    ("citymall_admin@gamehub.local", "Test@123", "TENANT_ADMIN", "CityMall"),
    ("manager123@gamehub.local", "123@manager", "MANAGER", "CityMall"),
    ("citymallcashier@gamehub.local", "123@cashier", "CASHIER", "CityMall"),
]


def get_or_create_tenant(db, name: str) -> Tenant:
    tenant = db.query(Tenant).filter(func.lower(Tenant.name) == name.lower()).first()
    if tenant:
        return tenant
    tenant = Tenant(name=name, status="active")
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


def upsert_user(db, email: str, password: str, role_name: str, tenant: Tenant, force: bool) -> None:
    email_clean = email.strip().lower()
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise RuntimeError(f"Role not found: {role_name}. Run migrations first.")

    existing = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if existing:
        if force:
            existing.password_hash = hash_password(password)
            existing.role_id = role.id
            existing.tenant_id = tenant.id
            existing.is_active = True
            db.commit()
            print(f"Updated: {email_clean} ({role_name})")
        else:
            print(f"Skipped (exists): {email_clean}. Use --force to reset password.")
        return

    user = User(
        email=email_clean,
        password_hash=hash_password(password),
        role_id=role.id,
        tenant_id=tenant.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    print(f"Created: {email_clean} ({role_name})")


def main():
    force = "--force" in sys.argv[1:]
    db = SessionLocal()
    try:
        default_tenant = db.query(Tenant).first()
        if not default_tenant:
            default_tenant = get_or_create_tenant(db, "GameHub Default")

        citymall_tenant = get_or_create_tenant(db, "CityMall")

        for email, password, role_name, tenant_name in USERS:
            tenant = citymall_tenant if tenant_name == "CityMall" else default_tenant
            upsert_user(db, email, password, role_name, tenant, force)
    finally:
        db.close()


if __name__ == "__main__":
    main()
