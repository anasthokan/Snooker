"""
Tenant owner self-service signup with Stripe subscription.
"""
from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.core.security import hash_password
from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import TokenPayload
from app.schemas.signup import SignupCheckoutRequest, SignupPricingResponse
from app.services.auth_service import create_tokens_for_user
from app.services.stripe_service import (
    PLAN_CONFIG,
    create_checkout_session,
    get_pricing_info,
    is_stripe_configured,
    retrieve_checkout_session,
    validate_coupon_code,
)

logger = logging.getLogger(__name__)


def get_signup_pricing(country: str, coupon_code: str | None = None) -> SignupPricingResponse:
    info = get_pricing_info(country, coupon_code)
    return SignupPricingResponse(**info)


def _get_tenant_admin_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == "TENANT_ADMIN").first()
    if not role:
        raise RuntimeError("TENANT_ADMIN role not found. Run migrations first.")
    return role


def _create_signup_account(
    db: Session,
    data: SignupCheckoutRequest,
    *,
    tenant_status: str,
    user_active: bool,
    subscription_status: str,
) -> tuple[Tenant, User]:
    country = data.country.upper()
    plan = PLAN_CONFIG[country]
    email = data.email.strip().lower()

    tenant = Tenant(
        name=data.business_name.strip(),
        status=tenant_status,
        subscription_plan=plan["subscription_plan"],
        billing_country=country,
        subscription_status=subscription_status,
    )
    db.add(tenant)
    db.flush()

    role = _get_tenant_admin_role(db)
    user = User(
        email=email,
        password_hash=hash_password(data.password),
        role_id=role.id,
        tenant_id=tenant.id,
        is_active=user_active,
    )
    db.add(user)
    db.commit()
    db.refresh(tenant)
    db.refresh(user)
    return tenant, user


def initiate_signup_checkout(
    db: Session,
    data: SignupCheckoutRequest,
    *,
    success_url: str,
    cancel_url: str,
) -> dict:
    country = data.country.upper()
    if country not in PLAN_CONFIG:
        raise ValueError("Country must be SA (Saudi Arabia) or IN (India)")

    coupon = validate_coupon_code(data.coupon_code)
    if not coupon["valid"]:
        raise ValueError(coupon["message"] or "Invalid coupon code")

    email = data.email.strip().lower()
    if len(data.password) < 6:
        raise ValueError("Password must be at least 6 characters")

    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise ValueError("Email already registered")

    pricing = get_pricing_info(country, data.coupon_code)
    sub_status = "trialing" if coupon["trial_days"] else "active"

    if not is_stripe_configured():
        tenant, user = _create_signup_account(
            db,
            data,
            tenant_status="active",
            user_active=True,
            subscription_status=sub_status,
        )
        tokens = create_tokens_for_user(user)
        logger.info("Direct signup (no Stripe) tenant_id=%s user_id=%s", tenant.id, user.id)
        return {
            "payment_mode": "direct",
            "checkout_url": None,
            "session_id": None,
            "tenant_id": tenant.id,
            "pricing": pricing,
            "tokens": tokens,
        }

    tenant, user = _create_signup_account(
        db,
        data,
        tenant_status="pending_payment",
        user_active=False,
        subscription_status="pending",
    )

    session = create_checkout_session(
        tenant_id=tenant.id,
        user_id=user.id,
        email=email,
        country=country,
        coupon_code=data.coupon_code,
        success_url=success_url,
        cancel_url=cancel_url,
    )

    return {
        "payment_mode": "stripe",
        "checkout_url": session.url,
        "session_id": session.id,
        "tenant_id": tenant.id,
        "pricing": pricing,
        "tokens": None,
    }


def activate_signup_from_session(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    stripe_customer_id: str | None,
    stripe_subscription_id: str | None,
    subscription_status: str = "active",
) -> None:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    user = db.query(User).options(selectinload(User.role)).filter(User.id == user_id).first()
    if not tenant or not user:
        logger.warning("Signup activation skipped: tenant=%s user=%s not found", tenant_id, user_id)
        return
    tenant.status = "active"
    tenant.subscription_status = subscription_status
    if stripe_customer_id:
        tenant.stripe_customer_id = stripe_customer_id
    if stripe_subscription_id:
        tenant.stripe_subscription_id = stripe_subscription_id
    user.is_active = True
    db.commit()
    logger.info("Activated signup tenant_id=%s user_id=%s", tenant_id, user_id)


def complete_signup_from_checkout_session(db: Session, session_id: str) -> Optional[TokenPayload]:
    """Verify Stripe checkout session and activate tenant; return login tokens."""
    session = retrieve_checkout_session(session_id)
    metadata = session.metadata or {}
    tenant_id = int(metadata.get("tenant_id", 0))
    user_id = int(metadata.get("user_id", 0))
    if not tenant_id or not user_id:
        raise ValueError("Invalid checkout session")

    user = db.query(User).options(selectinload(User.role)).filter(User.id == user_id).first()
    if user and user.is_active:
        return create_tokens_for_user(user)

    if session.status != "complete":
        raise ValueError("Payment not completed yet")

    payment_status = session.payment_status
    subscription_id = session.subscription
    sub_id = subscription_id if isinstance(subscription_id, str) else getattr(subscription_id, "id", subscription_id)
    customer_id = session.customer
    cust_id = customer_id if isinstance(customer_id, str) else getattr(customer_id, "id", customer_id)

    if payment_status in ("paid", "no_payment_required"):
        activate_signup_from_session(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            stripe_customer_id=cust_id,
            stripe_subscription_id=sub_id,
            subscription_status="trialing" if payment_status == "no_payment_required" else "active",
        )
    else:
        raise ValueError("Payment not completed yet")

    user = db.query(User).options(selectinload(User.role)).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise ValueError("Account activation pending")
    return create_tokens_for_user(user)
