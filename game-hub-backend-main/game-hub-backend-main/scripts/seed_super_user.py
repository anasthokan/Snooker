"""
Seed first super admin user. Run after migrations.
Usage: python -m scripts.seed_super_user [email [password]] [--force]
  --force: if user exists, reset password (so you can fix 401 login).
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


def main():
    args = [a for a in sys.argv[1:] if a != "--force"]
    force = "--force" in sys.argv[1:]
    email = os.environ.get("ADMIN_EMAIL", "admin@gamehub.local")
    password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    if len(args) >= 2:
        email, password = args[0], args[1]
    elif len(args) >= 1:
        email = args[0]
    email = (email or "").strip().lower()
    db = SessionLocal()
    try:
        role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
        if not role:
            print("Run migrations first to create roles.")
            sys.exit(1)
        tenant = db.query(Tenant).first()
        if not tenant:
            tenant = Tenant(name="GameHub Default", status="active")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
        existing = db.query(User).filter(func.lower(User.email) == email).first()
        if existing:
            if force:
                existing.password_hash = hash_password(password)
                existing.is_active = True
                db.commit()
                print(f"Password reset for: {email}")
            else:
                print(f"User {email} already exists. Use --force to reset password.")
            return
        user = User(
            email=email,
            password_hash=hash_password(password),
            role_id=role.id,
            tenant_id=tenant.id,
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Created super admin: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
