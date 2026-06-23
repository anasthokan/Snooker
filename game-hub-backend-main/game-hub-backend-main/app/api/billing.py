
"""Billing API (v3): v2 + GET /billing/session/{session_id}/bill-pdf (80mm Zebra thermal, 15% VAT, QR)."""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, RequireCashier
from app.core.database import get_db
from app.core.config import get_settings
from app.models.user import User
from app.schemas.billing import (
    BillingCalculateRequest,
    BillingBreakdown,
    PaymentCreateRequest,
    PaymentSplitRequest,
    PaymentResponse,
)
from app.schemas.common import SuccessResponse
from app.services.billing_service import calculate_bill, apply_total_to_session
from app.services.payment_service import (
    create_payment,
    create_split_payments,
    list_payments_by_session,
)
from app.services.pdf_bill_service import generate_bill_pdf

router = APIRouter(prefix="/billing", tags=["Billing"], dependencies=[RequireCashier])


@router.post("/calculate", response_model=SuccessResponse[BillingBreakdown])
def billing_calculate(
    body: BillingCalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate bill: game + canteen + VAT (default 15%) - discount."""
    try:
        result = calculate_bill(
            db,
            body.session_id,
            current_user.tenant_id,
            vat_percent=body.vat_percent,
            discount_amount=body.discount_amount,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data=BillingBreakdown(**result))


@router.get("/session/{session_id}/bill-pdf")
def get_bill_pdf(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate and return PDF bill for session (80mm Zebra thermal).
    Includes Game Charge, Canteen Charge, VAT 15%, Total, and QR code for verification.
    """
    try:
        settings = get_settings()
        verification_url = settings.bill_verification_base_url or ""
        pdf_bytes = generate_bill_pdf(
            db,
            session_id,
            current_user.tenant_id,
            verification_base_url=verification_url or None,
            vat_percent=Decimal("15"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=bill-session-{session_id}.pdf"},
    )


payments_router = APIRouter(prefix="/payments", tags=["Payments"], dependencies=[RequireCashier])


@payments_router.post("", response_model=SuccessResponse[PaymentResponse], status_code=201)
def post_payment(
    body: PaymentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        payment = create_payment(
            db, body.session_id, current_user.tenant_id, body.amount, body.method, body.status
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data=PaymentResponse.model_validate(payment), message="Payment recorded")


@payments_router.post("/split", response_model=SuccessResponse[list[PaymentResponse]])
def post_split_payment(
    body: PaymentSplitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        payments = create_split_payments(
            db, body.session_id, current_user.tenant_id, body.payments
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(
        data=[PaymentResponse.model_validate(p) for p in payments],
        message="Split payments recorded",
    )


@payments_router.get("/session/{session_id}", response_model=SuccessResponse[list[PaymentResponse]])
def get_payments_by_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payments = list_payments_by_session(db, session_id, current_user.tenant_id)
    return SuccessResponse(data=[PaymentResponse.model_validate(p) for p in payments])
