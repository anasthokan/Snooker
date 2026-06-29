"""
Stripe subscription billing for tenant signup.
Stripe is optional — app runs without it until STRIPE_SECRET_KEY is configured.
"""
from __future__ import annotations

import logging
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)

try:
    import stripe
except ImportError:
    stripe = None  # type: ignore[assignment]

FIRSTFREE_COUPON = "FIRSTFREE"
TRIAL_DAYS = 30

PLAN_CONFIG = {
    "SA": {
        "currency": "sar",
        "amount": 5000,  # 50 SAR in halalas
        "label": "50 SAR/month",
        "subscription_plan": "monthly_sar",
    },
    "IN": {
        "currency": "inr",
        "amount": 100000,  # 1000 INR in paise
        "label": "₹1,000/month",
        "subscription_plan": "monthly_inr",
    },
}


def is_stripe_configured() -> bool:
    if stripe is None:
        return False
    return bool(get_settings().stripe_secret_key)


def _ensure_stripe_configured() -> None:
    if stripe is None:
        raise RuntimeError("Stripe package not installed. Run: pip install stripe")
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise RuntimeError("Stripe is not configured. Set STRIPE_SECRET_KEY in environment.")
    stripe.api_key = settings.stripe_secret_key


def validate_coupon_code(coupon_code: str | None) -> dict[str, Any]:
    """Validate signup coupon. FIRSTFREE grants a 30-day free trial."""
    if not coupon_code or not coupon_code.strip():
        return {"valid": True, "trial_days": 0, "code": None, "message": None}
    code = coupon_code.strip().upper()
    if code == FIRSTFREE_COUPON:
        return {
            "valid": True,
            "trial_days": TRIAL_DAYS,
            "code": FIRSTFREE_COUPON,
            "message": "First month free! Billing starts after 30 days.",
        }
    return {"valid": False, "trial_days": 0, "code": code, "message": "Invalid coupon code"}


def get_pricing_info(country: str, coupon_code: str | None = None) -> dict[str, Any]:
    country = (country or "").upper()
    if country not in PLAN_CONFIG:
        raise ValueError("Country must be SA (Saudi Arabia) or IN (India)")
    plan = PLAN_CONFIG[country]
    coupon = validate_coupon_code(coupon_code)
    if not coupon["valid"]:
        raise ValueError(coupon["message"] or "Invalid coupon code")
    trial_days = coupon["trial_days"]
    if trial_days:
        display = f"First month FREE, then {plan['label']}"
    else:
        display = plan["label"]
    return {
        "country": country,
        "currency": plan["currency"],
        "amount": plan["amount"],
        "monthly_label": plan["label"],
        "display_price": display,
        "trial_days": trial_days,
        "coupon_applied": coupon["code"],
        "has_trial": trial_days > 0,
    }


def _line_item(country: str) -> dict[str, Any]:
    settings = get_settings()
    plan = PLAN_CONFIG[country]
    price_id = settings.stripe_price_sar if country == "SA" else settings.stripe_price_inr
    if price_id:
        return {"price": price_id, "quantity": 1}
    return {
        "price_data": {
            "currency": plan["currency"],
            "product_data": {"name": "GameHub Pro Monthly Subscription"},
            "unit_amount": plan["amount"],
            "recurring": {"interval": "month"},
        },
        "quantity": 1,
    }


def create_checkout_session(
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    country: str,
    coupon_code: str | None,
    success_url: str,
    cancel_url: str,
) -> Any:
    _ensure_stripe_configured()

    country = country.upper()
    if country not in PLAN_CONFIG:
        raise ValueError("Country must be SA or IN")

    coupon = validate_coupon_code(coupon_code)
    if not coupon["valid"]:
        raise ValueError(coupon["message"] or "Invalid coupon code")

    subscription_data: dict[str, Any] = {
        "metadata": {
            "tenant_id": str(tenant_id),
            "user_id": str(user_id),
            "billing_country": country,
            "coupon_code": coupon["code"] or "",
        },
    }
    if coupon["trial_days"]:
        subscription_data["trial_period_days"] = coupon["trial_days"]

    return stripe.checkout.Session.create(
        mode="subscription",
        customer_email=email,
        line_items=[_line_item(country)],
        success_url=success_url,
        cancel_url=cancel_url,
        subscription_data=subscription_data,
        metadata={
            "tenant_id": str(tenant_id),
            "user_id": str(user_id),
            "billing_country": country,
        },
    )


def retrieve_checkout_session(session_id: str) -> Any:
    _ensure_stripe_configured()
    return stripe.checkout.Session.retrieve(session_id)


def construct_webhook_event(payload: bytes, sig_header: str | None) -> Any:
    _ensure_stripe_configured()
    settings = get_settings()
    if not settings.stripe_webhook_secret:
        raise RuntimeError("Stripe webhook secret is not configured")
    if not sig_header:
        raise ValueError("Missing Stripe signature header")
    return stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
