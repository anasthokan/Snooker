"""
Billing API v1: session bill + canteen-only bill PDF with VAT No, CR No.
"""
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
from app.schemas.billing_1 import CanteenBillBreakdown
from app.schemas.common import SuccessResponse
from app.services.billing_service_1 import calculate_bill, calculate_canteen_only_bill, apply_total_to_session
from app.services.payment_service import (
    create_payment,
    create_split_payments,
    list_payments_by_session,
)
from app.services.pdf_bill_service_1 import generate_bill_pdf, generate_canteen_only_bill_pdf

router = APIRouter(prefix="/billing", tags=["Billing v1"], dependencies=[RequireCashier])


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


@router.post("/canteen/{canteen_bill_id}/calculate", response_model=SuccessResponse[CanteenBillBreakdown])
def canteen_bill_calculate(
    canteen_bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate canteen-only bill for walk-in order."""
    try:
        result = calculate_canteen_only_bill(
            db, canteen_bill_id, current_user.tenant_id, vat_percent=Decimal("15")
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(
        data=CanteenBillBreakdown(
            canteen_charge=result["canteen_charge"],
            subtotal=result["subtotal"],
            vat_percent=result["vat_percent"],
            vat_amount=result["vat_amount"],
            discount_amount=result["discount_amount"],
            total=result["total"],
        )
    )


@router.get("/session/{session_id}/bill-pdf")
def get_bill_pdf(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate PDF bill for session (80mm Zebra thermal).
    Includes VAT No, CR No, Game Charge, Canteen Charge, VAT 15%, Total, QR code.
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


@router.get("/canteen/{canteen_bill_id}/bill-pdf")
def get_canteen_bill_pdf(
    canteen_bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate PDF bill for walk-in canteen order (food only).
    Includes VAT No, CR No, items, subtotal, VAT, total, QR code.
    """
    try:
        pdf_bytes = generate_canteen_only_bill_pdf(
            db,
            canteen_bill_id,
            current_user.tenant_id,
            vat_percent=Decimal("15"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=bill-canteen-{canteen_bill_id}.pdf"},
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
            db,
            body.session_id,
            current_user.tenant_id,
            body.amount,
            body.method,
            body.status,
            customer_id=body.customer_id,
            customer_name=body.customer_name,
            customer_mobile=body.customer_mobile,
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
