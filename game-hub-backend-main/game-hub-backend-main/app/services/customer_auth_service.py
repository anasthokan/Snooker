"""
Customer authentication: signup, login, token creation.
"""
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.jwt import create_access_token, create_refresh_token
from app.core.security import hash_password, verify_password
from app.models.customer import Customer
from app.models.tenant import Tenant
from app.models.game_unit import GameUnit
from app.schemas.customer_auth import CustomerAuthResponse, CustomerSignupRequest

settings = get_settings()
CUSTOMER_ROLE = "CUSTOMER"


def get_customer_by_id(db: Session, customer_id: int) -> Customer | None:
    return db.query(Customer).filter(Customer.id == customer_id).first()


def _normalize_mobile(mobile: str) -> str:
    return "".join(ch for ch in (mobile or "").strip() if ch.isdigit())


def get_default_customer_tenant(db: Session) -> Tenant | None:
    """Parlour used for /customer/login and /customer/signup without ?tenant=."""
    row = (
        db.query(Tenant.id, func.count(GameUnit.id).label("unit_count"))
        .outerjoin(GameUnit, GameUnit.tenant_id == Tenant.id)
        .filter(Tenant.status == "active")
        .group_by(Tenant.id)
        .order_by(func.count(GameUnit.id).desc(), Tenant.id.desc())
        .first()
    )
    if row:
        return db.query(Tenant).filter(Tenant.id == row[0]).first()
    return db.query(Tenant).filter(Tenant.status == "active").order_by(Tenant.id.desc()).first()


def resolve_customer_tenant_id(db: Session, tenant_id: int | None) -> int:
    if tenant_id is not None:
        return tenant_id
    tenant = get_default_customer_tenant(db)
    if not tenant:
        raise ValueError("No parlour is configured")
    return tenant.id


def register_customer(db: Session, data: CustomerSignupRequest) -> Customer:
    tenant_id = resolve_customer_tenant_id(db, data.tenant_id)
    tenant = (
        db.query(Tenant)
        .filter(Tenant.id == tenant_id, Tenant.status == "active")
        .first()
    )
    if not tenant:
        raise ValueError("Parlour not found")

    mobile = _normalize_mobile(data.mobile)
    if len(mobile) < 8:
        raise ValueError("Enter a valid mobile number")

    existing = (
        db.query(Customer)
        .filter(Customer.tenant_id == tenant_id, Customer.mobile == mobile)
        .first()
    )
    if existing:
        raise ValueError("An account with this mobile number already exists")

    email_clean = (data.email or "").strip().lower() or None
    if email_clean:
        email_taken = (
            db.query(Customer)
            .filter(
                Customer.tenant_id == tenant_id,
                func.lower(Customer.email) == email_clean,
            )
            .first()
        )
        if email_taken:
            raise ValueError("An account with this email already exists")

    if len(data.password) < 6:
        raise ValueError("Password must be at least 6 characters")

    customer = Customer(
        tenant_id=tenant_id,
        name=data.name.strip(),
        mobile=mobile,
        email=email_clean,
        password_hash=hash_password(data.password),
        is_active=True,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def authenticate_customer(
    db: Session,
    mobile: str,
    password: str,
    tenant_id: int | None = None,
) -> Optional[Customer]:
    mobile_clean = _normalize_mobile(mobile)
    if not mobile_clean:
        return None

    if tenant_id is not None:
        customer = (
            db.query(Customer)
            .filter(Customer.tenant_id == tenant_id, Customer.mobile == mobile_clean)
            .first()
        )
        if not customer or not customer.is_active or not customer.password_hash:
            return None
        if not verify_password(password, customer.password_hash):
            return None
        return customer

    customers = (
        db.query(Customer)
        .join(Tenant, Tenant.id == Customer.tenant_id)
        .filter(
            Customer.mobile == mobile_clean,
            Customer.is_active.is_(True),
            Customer.password_hash.isnot(None),
            Tenant.status == "active",
        )
        .all()
    )
    matches = [c for c in customers if verify_password(password, c.password_hash)]
    if not matches:
        return None
    if len(matches) == 1:
        return matches[0]

    default_tenant = get_default_customer_tenant(db)
    if default_tenant:
        for customer in matches:
            if customer.tenant_id == default_tenant.id:
                return customer
    return matches[0]


def create_tokens_for_customer(customer: Customer) -> CustomerAuthResponse:
    access = create_access_token(
        subject=customer.id,
        tenant_id=customer.tenant_id,
        role=CUSTOMER_ROLE,
        subject_type="customer",
    )
    refresh = create_refresh_token(customer.id, subject_type="customer")
    return CustomerAuthResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
        customer={
            "id": customer.id,
            "name": customer.name,
            "mobile": customer.mobile,
            "email": customer.email,
            "tenant_id": customer.tenant_id,
        },
    )
