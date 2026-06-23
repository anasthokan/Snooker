"""
User management: list, create, get, update. Tenant-scoped; Super Admin can manage any tenant.
"""
from typing import Sequence

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.models.role import Role
from app.models.tenant import Tenant
from app.schemas.user import UserCreate, UserUpdate


def list_users(
    db: Session,
    tenant_id: int | None,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[User]:
    """List users. If tenant_id is None (Super Admin), list all; else filter by tenant."""
    q = db.query(User)
    if tenant_id is not None:
        q = q.filter(User.tenant_id == tenant_id)
    return q.offset(skip).limit(limit).all()


def get_user_by_id_for_admin(db: Session, user_id: int, admin_tenant_id: int, is_super_admin: bool) -> User | None:
    """Get user by id; ensure admin has access (own tenant or super admin)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    if is_super_admin:
        return user
    if user.tenant_id != admin_tenant_id:
        return None
    return user


def create_user(db: Session, data: UserCreate, allowed_tenant_id: int | None) -> User:
    """
    Create a user. allowed_tenant_id: if None (Super Admin), data.tenant_id is used;
    else (Tenant Admin) must equal data.tenant_id.
    """
    if allowed_tenant_id is not None and data.tenant_id != allowed_tenant_id:
        raise ValueError("Cannot create user for another tenant")
    role = db.query(Role).filter(Role.id == data.role_id).first()
    if not role:
        raise ValueError("Role not found")
    tenant = db.query(Tenant).filter(Tenant.id == data.tenant_id).first()
    if not tenant:
        raise ValueError("Tenant not found")
    existing = db.query(User).filter(func.lower(User.email) == data.email.strip().lower()).first()
    if existing:
        raise ValueError("Email already registered")
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=data.role_id,
        tenant_id=data.tenant_id,
        is_active=data.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, data: UserUpdate, allowed_tenant_id: int | None) -> User:
    """Update user. allowed_tenant_id: if None, can change tenant_id; else must match user.tenant_id."""
    if allowed_tenant_id is not None and user.tenant_id != allowed_tenant_id:
        raise ValueError("Cannot update user from another tenant")
    if data.email is not None:
        other = db.query(User).filter(func.lower(User.email) == data.email.strip().lower(), User.id != user.id).first()
        if other:
            raise ValueError("Email already in use")
        user.email = data.email
    if data.role_id is not None:
        role = db.query(Role).filter(Role.id == data.role_id).first()
        if not role:
            raise ValueError("Role not found")
        user.role_id = data.role_id
    if data.tenant_id is not None:
        if allowed_tenant_id is not None:
            raise ValueError("Only Super Admin can change tenant")
        tenant = db.query(Tenant).filter(Tenant.id == data.tenant_id).first()
        if not tenant:
            raise ValueError("Tenant not found")
        user.tenant_id = data.tenant_id
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password is not None and data.password.strip():
        user.password_hash = hash_password(data.password)
    db.commit()
    db.refresh(user)
    return user
