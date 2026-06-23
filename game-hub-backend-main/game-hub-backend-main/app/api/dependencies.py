"""
FastAPI dependencies: DB, auth, RBAC, tenant.
"""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.jwt import decode_token
from app.models.user import User
from app.models.customer import Customer
from app.services.auth_service import get_user_by_id
from app.services.customer_auth_service import get_customer_by_id

security = HTTPBearer(auto_error=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

# Role names from design doc
SUPER_ADMIN = "SUPER_ADMIN"
TENANT_ADMIN = "TENANT_ADMIN"
MANAGER = "MANAGER"
CASHIER = "CASHIER"

ALL_ROLES = (SUPER_ADMIN, TENANT_ADMIN, MANAGER, CASHIER)


def get_optional_token(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)]):
    """Extract Bearer token if present."""
    if credentials:
        return credentials.credentials
    return None


def get_current_user_optional(
    db: Annotated[Session, Depends(get_db)],
    token: Annotated[str | None, Depends(get_optional_token)],
) -> User | None:
    """Return current user if valid token present, else None. Used for optional auth."""
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    if payload.get("sub_type") == "customer":
        return None
    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError):
        return None
    user = get_user_by_id(db, user_id)
    if not user or not user.is_active:
        return None
    return user


def get_current_customer_optional(
    db: Annotated[Session, Depends(get_db)],
    token: Annotated[str | None, Depends(get_optional_token)],
) -> Customer | None:
    """Return current customer if valid customer token present."""
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    if payload.get("sub_type") != "customer":
        return None
    try:
        customer_id = int(payload["sub"])
    except (KeyError, ValueError):
        return None
    customer = get_customer_by_id(db, customer_id)
    if not customer or not customer.is_active:
        return None
    return customer


def get_current_user(
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    """Require authenticated user. Raises 401 if missing or invalid."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_customer(
    customer: Annotated[Customer | None, Depends(get_current_customer_optional)],
) -> Customer:
    """Require authenticated customer."""
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return customer


def require_roles(*allowed_roles: str):
    """Dependency factory: require current user to have one of the given roles."""

    def _check(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        role_name = current_user.role.name if current_user.role else None
        if role_name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _check


# Convenience dependencies
RequireSuperAdmin = Depends(require_roles(SUPER_ADMIN))
RequireTenantAdmin = Depends(require_roles(SUPER_ADMIN, TENANT_ADMIN))
RequireManager = Depends(require_roles(SUPER_ADMIN, TENANT_ADMIN, MANAGER))
RequireCashier = Depends(require_roles(SUPER_ADMIN, TENANT_ADMIN, MANAGER, CASHIER))
