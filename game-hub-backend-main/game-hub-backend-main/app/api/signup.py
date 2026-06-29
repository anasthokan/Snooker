"""
Tenant owner signup API with Stripe subscription checkout.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.auth import TokenPayload
from app.schemas.common import SuccessResponse
from app.schemas.signup import (
    SignupCheckoutRequest,
    SignupCheckoutResponse,
    SignupCompleteRequest,
    SignupPricingResponse,
    StripeConfigResponse,
)
from app.services.signup_service import (
    activate_signup_from_session,
    complete_signup_from_checkout_session,
    get_signup_pricing,
    initiate_signup_checkout,
)
from app.services.stripe_service import construct_webhook_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/signup", tags=["Signup"])
settings = get_settings()


@router.get("/config", response_model=SuccessResponse[StripeConfigResponse])
def signup_config():
    """Return Stripe publishable key for frontend (if configured)."""
    return SuccessResponse(
        data=StripeConfigResponse(
            publishable_key=settings.stripe_publishable_key,
            configured=bool(settings.stripe_secret_key),
        ),
        message="OK",
    )


@router.get("/pricing", response_model=SuccessResponse[SignupPricingResponse])
def signup_pricing(
    country: str = Query(..., description="SA or IN"),
    coupon_code: str | None = Query(None),
):
    """Get regional pricing and trial info for signup."""
    try:
        pricing = get_signup_pricing(country, coupon_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data=pricing, message="OK")


@router.post("/checkout", response_model=SuccessResponse[SignupCheckoutResponse])
def signup_checkout(
    body: SignupCheckoutRequest,
    db: Session = Depends(get_db),
):
    """Create tenant account and redirect to Stripe Checkout for subscription."""
    app_url = settings.public_app_url.rstrip("/")
    success_url = f"{app_url}/signup/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{app_url}/signup?cancelled=1"
    try:
        result = initiate_signup_checkout(
            db,
            body,
            success_url=success_url,
            cancel_url=cancel_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    tokens = result.get("tokens")
    return SuccessResponse(
        data=SignupCheckoutResponse(
            payment_mode=result["payment_mode"],
            checkout_url=result.get("checkout_url"),
            session_id=result.get("session_id"),
            tenant_id=result["tenant_id"],
            pricing=SignupPricingResponse(**result["pricing"]),
            access_token=tokens.access_token if tokens else None,
            refresh_token=tokens.refresh_token if tokens else None,
            expires_in=tokens.expires_in if tokens else None,
        ),
        message="Signup complete" if result["payment_mode"] == "direct" else "Redirect to Stripe Checkout",
    )


@router.post("/complete", response_model=SuccessResponse[TokenPayload])
def signup_complete(
    body: SignupCompleteRequest,
    db: Session = Depends(get_db),
):
    """Verify Stripe checkout and return auth tokens after successful signup."""
    try:
        tokens = complete_signup_from_checkout_session(db, body.session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    if not tokens:
        raise HTTPException(status_code=400, detail="Account activation failed")
    return SuccessResponse(data=tokens, message="Signup complete")


@router.post("/webhook", status_code=200)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe webhook for subscription checkout completion."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        event = construct_webhook_event(payload, sig)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    if event.type == "checkout.session.completed":
        session = event.data.object
        metadata = session.get("metadata") or {}
        tenant_id = int(metadata.get("tenant_id", 0))
        user_id = int(metadata.get("user_id", 0))
        if tenant_id and user_id:
            activate_signup_from_session(
                db,
                tenant_id=tenant_id,
                user_id=user_id,
                stripe_customer_id=session.get("customer"),
                stripe_subscription_id=session.get("subscription"),
                subscription_status="trialing" if session.get("payment_status") == "no_payment_required" else "active",
            )
    return {"received": True}
