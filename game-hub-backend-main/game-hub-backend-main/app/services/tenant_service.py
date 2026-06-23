"""
Tenant CRUD and tenant-scoped query helpers.
"""
from typing import Sequence

from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantUpdate


def create_tenant(db: Session, data: TenantCreate) -> Tenant:
    """Create a new tenant."""
    tenant = Tenant(
        name=data.name,
        status=data.status,
        subscription_plan=data.subscription_plan,
        vat_no=data.vat_no,
        cr_no=data.cr_no,
        invoice_logo_url=data.invoice_logo_url,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


def get_tenant_by_id(db: Session, tenant_id: int) -> Tenant | None:
    """Get tenant by id."""
    return db.query(Tenant).filter(Tenant.id == tenant_id).first()


def list_tenants(db: Session, skip: int = 0, limit: int = 100) -> Sequence[Tenant]:
    """List all tenants (for super admin)."""
    return db.query(Tenant).offset(skip).limit(limit).all()


def update_tenant(db: Session, tenant: Tenant, data: TenantUpdate) -> Tenant:
    """Update tenant fields."""
    if data.name is not None:
        tenant.name = data.name
    if data.status is not None:
        tenant.status = data.status
    if data.subscription_plan is not None:
        tenant.subscription_plan = data.subscription_plan
    if data.vat_no is not None:
        tenant.vat_no = data.vat_no
    if data.cr_no is not None:
        tenant.cr_no = data.cr_no
    if data.invoice_logo_url is not None:
        tenant.invoice_logo_url = data.invoice_logo_url
    db.commit()
    db.refresh(tenant)
    return tenant


def ensure_tenant_access(tenant_id: int, current_tenant_id: int, is_super_admin: bool) -> None:
    """
    Raise 403 if current user's tenant does not match tenant_id and user is not super admin.
    """
    if is_super_admin:
        return
    if current_tenant_id != tenant_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied to this tenant")
