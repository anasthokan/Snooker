"""
Tenant API: CRUD for tenants. Super admin can list/create; tenant admin can update own.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_roles, SUPER_ADMIN, TENANT_ADMIN
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse, ErrorResponse
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse
from app.services.tenant_service import (
    create_tenant,
    get_tenant_by_id,
    list_tenants,
    update_tenant,
    ensure_tenant_access,
)

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.post("", response_model=SuccessResponse[TenantResponse], status_code=status.HTTP_201_CREATED)
def create(
    body: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SUPER_ADMIN)),
):
    """Create a new tenant (Super Admin only)."""
    tenant = create_tenant(db, body)
    return SuccessResponse(data=TenantResponse.model_validate(tenant), message="Tenant created")


@router.get("", response_model=SuccessResponse[list[TenantResponse]])
def list_all(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SUPER_ADMIN)),
):
    """List all tenants (Super Admin only)."""
    tenants = list_tenants(db, skip=skip, limit=limit)
    return SuccessResponse(data=[TenantResponse.model_validate(t) for t in tenants])


@router.get("/{tenant_id}", response_model=SuccessResponse[TenantResponse])
def get_one(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get one tenant by id. Super Admin: any; others: own tenant only."""
    tenant = get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    ensure_tenant_access(tenant_id, current_user.tenant_id, current_user.role.name == SUPER_ADMIN)
    return SuccessResponse(data=TenantResponse.model_validate(tenant))


@router.patch("/{tenant_id}", response_model=SuccessResponse[TenantResponse])
def update(
    tenant_id: int,
    body: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update tenant. Super Admin: any; Tenant Admin: own only."""
    tenant = get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    ensure_tenant_access(tenant_id, current_user.tenant_id, current_user.role.name == SUPER_ADMIN)
    if current_user.role.name not in (SUPER_ADMIN, TENANT_ADMIN):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    tenant = update_tenant(db, tenant, body)
    return SuccessResponse(data=TenantResponse.model_validate(tenant), message="Tenant updated")
