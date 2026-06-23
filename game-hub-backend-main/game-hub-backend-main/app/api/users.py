"""
User management API: list, create, get, update. Roles list for dropdowns.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_roles, SUPER_ADMIN, TENANT_ADMIN
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.user import UserCreate, UserUpdate, UserResponse, RoleResponse
from app.services.user_service import (
    list_users,
    get_user_by_id_for_admin,
    create_user,
    update_user,
)
from app.models.role import Role

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/roles", response_model=SuccessResponse[list[RoleResponse]])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SUPER_ADMIN, TENANT_ADMIN)),
):
    """List all roles (for dropdown when creating/editing users)."""
    roles = db.query(Role).order_by(Role.id).all()
    return SuccessResponse(data=[RoleResponse.model_validate(r) for r in roles])


@router.get("", response_model=SuccessResponse[list[UserResponse]])
def list_all_users(
    tenant_id: int | None = Query(None, description="Filter by tenant (Super Admin only)"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SUPER_ADMIN, TENANT_ADMIN)),
):
    """List users. Super Admin: all or filter by tenant_id. Tenant Admin: own tenant only."""
    if current_user.role.name == SUPER_ADMIN:
        list_tenant_id = tenant_id
    else:
        list_tenant_id = current_user.tenant_id
    users = list_users(db, list_tenant_id, skip=skip, limit=limit)
    return SuccessResponse(data=[UserResponse.model_validate(u) for u in users])


@router.post("", response_model=SuccessResponse[UserResponse], status_code=201)
def create_user_endpoint(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SUPER_ADMIN, TENANT_ADMIN)),
):
    """Create a user. Super Admin: any tenant. Tenant Admin: own tenant only."""
    allowed_tenant = None if current_user.role.name == SUPER_ADMIN else current_user.tenant_id
    try:
        user = create_user(db, body, allowed_tenant)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data=UserResponse.model_validate(user), message="User created")


@router.get("/{user_id}", response_model=SuccessResponse[UserResponse])
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SUPER_ADMIN, TENANT_ADMIN)),
):
    """Get one user by id (within allowed tenant)."""
    user = get_user_by_id_for_admin(
        db, user_id, current_user.tenant_id, current_user.role.name == SUPER_ADMIN
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return SuccessResponse(data=UserResponse.model_validate(user))


@router.patch("/{user_id}", response_model=SuccessResponse[UserResponse])
def update_user_endpoint(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SUPER_ADMIN, TENANT_ADMIN)),
):
    """Update user (role, tenant for Super Admin, is_active, password)."""
    user = get_user_by_id_for_admin(
        db, user_id, current_user.tenant_id, current_user.role.name == SUPER_ADMIN
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        user = update_user(
            db, user, body,
            None if current_user.role.name == SUPER_ADMIN else current_user.tenant_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data=UserResponse.model_validate(user), message="User updated")
