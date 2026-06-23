"""
Public payment API (no login) — customer balance lookup and Moyasar verification.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.tenant import Tenant
from app.schemas.common import SuccessResponse
from app.services.moyasar_service import get_public_customer_balance, process_account_settlement, process_session_payment
from app.services.customer_auth_service import get_default_customer_tenant

router = APIRouter(prefix="/public/pay", tags=["Public Payments"])


class PayConfigResponse(BaseModel):
    tenant_id: int
    tenant_name: str
    publishable_key: str
    currency: str = "SAR"
    public_app_url: str


class CustomerBalanceResponse(BaseModel):
    customer_id: int
    tenant_id: int
    name: str
    mobile: str | None
    balance: float


class VerifyPaymentRequest(BaseModel):
    moyasar_payment_id: str = Field(min_length=1)
    tenant_id: int
    purpose: str = "account_settlement"  # account_settlement | session
    customer_id: int | None = None
    mobile: str | None = None
    session_id: int | None = None


class VerifyPaymentResponse(BaseModel):
    status: str
    amount: float
    purpose: str
    message: str


@router.get("/config", response_model=SuccessResponse[PayConfigResponse])
def pay_config(
    tenant_id: int | None = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    tenant = None
    if tenant_id is not None:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.status == "active").first()
    if not tenant:
        tenant = get_default_customer_tenant(db)
    if not tenant:
        raise HTTPException(status_code=404, detail="Parlour not found")
    publishable_key = settings.moyasar_publishable_key or ""
    return SuccessResponse(
        data=PayConfigResponse(
            tenant_id=tenant.id,
            tenant_name=tenant.name,
            publishable_key=publishable_key,
            public_app_url=settings.public_app_url.rstrip("/"),
        )
    )


@router.get("/balance", response_model=SuccessResponse[CustomerBalanceResponse])
def customer_balance(
    mobile: str = Query(..., min_length=3),
    tenant_id: int | None = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    row = get_public_customer_balance(db, tenant_id, mobile)
    if not row:
        raise HTTPException(status_code=404, detail="No account found for this mobile number")
    return SuccessResponse(
        data=CustomerBalanceResponse(
            customer_id=row["customer_id"],
            tenant_id=row["tenant_id"],
            name=row["name"],
            mobile=row["mobile"],
            balance=float(row["balance"]),
        )
    )


@router.post("/verify", response_model=SuccessResponse[VerifyPaymentResponse])
def verify_payment(body: VerifyPaymentRequest, db: Session = Depends(get_db)):
    try:
        if body.purpose == "session":
            if not body.session_id:
                raise ValueError("session_id is required")
            gw = process_session_payment(db, body.tenant_id, body.session_id, body.moyasar_payment_id)
        else:
            gw = process_account_settlement(
                db,
                body.tenant_id,
                body.moyasar_payment_id,
                customer_id=body.customer_id,
                mobile=body.mobile,
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(
        data=VerifyPaymentResponse(
            status=gw.status,
            amount=float(gw.amount),
            purpose=gw.purpose,
            message="Payment verified successfully",
        ),
        message="Payment verified",
    )
