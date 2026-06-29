"""Schemas for tenant owner signup with Stripe."""
from pydantic import BaseModel, Field


class SignupPricingResponse(BaseModel):
    country: str
    currency: str
    amount: int
    monthly_label: str
    display_price: str
    trial_days: int
    coupon_applied: str | None = None
    has_trial: bool


class SignupCheckoutRequest(BaseModel):
    business_name: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    country: str = Field(description="SA for Saudi Arabia, IN for India")
    coupon_code: str | None = None


class SignupCheckoutResponse(BaseModel):
    payment_mode: str = "stripe"  # stripe | direct
    checkout_url: str | None = None
    session_id: str | None = None
    tenant_id: int
    pricing: SignupPricingResponse
    access_token: str | None = None
    refresh_token: str | None = None
    expires_in: int | None = None


class SignupCompleteRequest(BaseModel):
    session_id: str = Field(min_length=1)


class StripeConfigResponse(BaseModel):
    publishable_key: str | None
    configured: bool
