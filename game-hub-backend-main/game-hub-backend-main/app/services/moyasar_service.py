"""
Moyasar payment gateway: verify payments and complete checkout.
"""
from decimal import Decimal

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.customer import Customer
from app.models.gateway_payment import GatewayPayment
from app.models.payment import Payment
from app.models.session import Session as SessionModel
from app.services.customer_account_service import get_balance, record_credit
from app.services.session_engine import end_session as engine_end_session

MOYASAR_API = "https://api.moyasar.com/v1/payments"


def sar_to_halalas(amount: Decimal) -> int:
    return int((amount * 100).quantize(Decimal("1")))


def halalas_to_sar(amount_halalas: int) -> Decimal:
    return Decimal(amount_halalas) / Decimal(100)


def fetch_moyasar_payment(payment_id: str) -> dict:
    settings = get_settings()
    if not settings.moyasar_secret_key:
        raise ValueError("Payment gateway is not configured")
    with httpx.Client(timeout=30.0) as client:
        res = client.get(
            f"{MOYASAR_API}/{payment_id}",
            auth=(settings.moyasar_secret_key, ""),
        )
    if res.status_code == 404:
        raise ValueError("Payment not found")
    if res.status_code >= 400:
        raise ValueError(f"Gateway error: {res.status_code}")
    return res.json()


def _normalize_mobile(mobile: str) -> str:
    return "".join(ch for ch in (mobile or "").strip() if ch.isdigit())


def _find_customer_by_mobile(db: Session, tenant_id: int, mobile: str) -> Customer | None:
    mobile_clean = _normalize_mobile(mobile)
    if not mobile_clean:
        return None
    return (
        db.query(Customer)
        .filter(Customer.tenant_id == tenant_id, Customer.mobile == mobile_clean)
        .first()
    )


def _resolve_customer_for_balance(
    db: Session, tenant_id: int | None, mobile: str
) -> tuple[Customer | None, int | None]:
    """Find customer by mobile; if tenant is wrong/missing, search all active parlours."""
    from app.models.tenant import Tenant
    from app.services.customer_auth_service import get_default_customer_tenant

    mobile_clean = _normalize_mobile(mobile)
    if not mobile_clean:
        return None, None

    if tenant_id is not None:
        customer = _find_customer_by_mobile(db, tenant_id, mobile_clean)
        if customer:
            return customer, tenant_id

    customers = (
        db.query(Customer)
        .join(Tenant, Tenant.id == Customer.tenant_id)
        .filter(Tenant.status == "active", Customer.mobile == mobile_clean)
        .all()
    )
    if not customers:
        return None, None
    if len(customers) == 1:
        c = customers[0]
        return c, c.tenant_id

    default_tenant = get_default_customer_tenant(db)
    if default_tenant:
        for c in customers:
            if c.tenant_id == default_tenant.id:
                return c, c.tenant_id
    c = customers[0]
    return c, c.tenant_id


def process_account_settlement(
    db: Session,
    tenant_id: int,
    moyasar_payment_id: str,
    customer_id: int | None = None,
    mobile: str | None = None,
) -> GatewayPayment:
    existing = (
        db.query(GatewayPayment)
        .filter(GatewayPayment.moyasar_payment_id == moyasar_payment_id)
        .first()
    )
    if existing and existing.status == "paid":
        return existing

    gateway_data = fetch_moyasar_payment(moyasar_payment_id)
    if gateway_data.get("status") != "paid":
        raise ValueError("Payment is not completed yet")

    paid_halalas = int(gateway_data.get("amount", 0))
    paid_amount = halalas_to_sar(paid_halalas)

    customer: Customer | None = None
    if customer_id:
        customer = (
            db.query(Customer)
            .filter(Customer.id == customer_id, Customer.tenant_id == tenant_id)
            .first()
        )
    if not customer and mobile:
        customer = _find_customer_by_mobile(db, tenant_id, mobile)
    if not customer:
        raise ValueError("Customer not found")

    if existing:
        gw = existing
        gw.status = "paid"
        gw.amount = paid_amount
        gw.customer_id = customer.id
    else:
        gw = GatewayPayment(
            tenant_id=tenant_id,
            customer_id=customer.id,
            session_id=None,
            moyasar_payment_id=moyasar_payment_id,
            amount=paid_amount,
            currency=gateway_data.get("currency", "SAR"),
            status="paid",
            purpose="account_settlement",
        )
        db.add(gw)

    record_credit(
        db,
        tenant_id,
        customer.id,
        paid_amount,
        f"Online payment via Moyasar ({moyasar_payment_id})",
    )
    db.commit()
    db.refresh(gw)
    return gw


def process_session_payment(
    db: Session,
    tenant_id: int,
    session_id: int,
    moyasar_payment_id: str,
) -> GatewayPayment:
    existing = (
        db.query(GatewayPayment)
        .filter(GatewayPayment.moyasar_payment_id == moyasar_payment_id)
        .first()
    )
    if existing and existing.status == "paid":
        return existing

    session = (
        db.query(SessionModel)
        .filter(SessionModel.id == session_id, SessionModel.tenant_id == tenant_id)
        .first()
    )
    if not session:
        raise ValueError("Session not found")
    if session.status == "ended":
        if existing:
            return existing
        raise ValueError("Session already ended")

    gateway_data = fetch_moyasar_payment(moyasar_payment_id)
    if gateway_data.get("status") != "paid":
        raise ValueError("Payment is not completed yet")

    paid_halalas = int(gateway_data.get("amount", 0))
    paid_amount = halalas_to_sar(paid_halalas)

    if existing:
        gw = existing
        gw.status = "paid"
        gw.amount = paid_amount
    else:
        gw = GatewayPayment(
            tenant_id=tenant_id,
            customer_id=None,
            session_id=session_id,
            moyasar_payment_id=moyasar_payment_id,
            amount=paid_amount,
            currency=gateway_data.get("currency", "SAR"),
            status="paid",
            purpose="session",
        )
        db.add(gw)

    payment = Payment(
        session_id=session_id,
        amount=paid_amount,
        method="online",
        status="completed",
    )
    db.add(payment)
    db.flush()
    engine_end_session(db, session_id, tenant_id)
    db.refresh(gw)
    return gw


def get_public_customer_balance(
    db: Session, tenant_id: int | None, mobile: str
) -> dict | None:
    customer, resolved_tenant_id = _resolve_customer_for_balance(db, tenant_id, mobile)
    if not customer or resolved_tenant_id is None:
        return None
    balance = get_balance(db, resolved_tenant_id, customer.id)
    return {
        "customer_id": customer.id,
        "tenant_id": resolved_tenant_id,
        "name": customer.name,
        "mobile": customer.mobile,
        "balance": balance,
    }
