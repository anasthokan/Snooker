"""
Payment service: record payment, list by session, split payments.
"""
from decimal import Decimal
from typing import Sequence

from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.session import Session as SessionModel
from app.services.customer_account_service import get_or_create_customer, record_debit


def get_session_for_tenant(db: Session, session_id: int, tenant_id: int) -> SessionModel | None:
    return (
        db.query(SessionModel)
        .filter(SessionModel.id == session_id, SessionModel.tenant_id == tenant_id)
        .first()
    )


def create_payment(
    db: Session,
    session_id: int,
    tenant_id: int,
    amount: Decimal,
    method: str,
    status: str = "completed",
    customer_id: int | None = None,
    customer_name: str | None = None,
    customer_mobile: str | None = None,
) -> Payment:
    """Record a single payment for a session. Credit method adds debit to customer account."""
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        raise ValueError("Session not found")

    if method == "credit":
        if customer_id:
            resolved_customer_id = customer_id
        elif customer_name and customer_name.strip():
            customer = get_or_create_customer(
                db, tenant_id, customer_name.strip(), customer_mobile
            )
            resolved_customer_id = customer.id
        else:
            raise ValueError("Customer is required for credit payment")
        payment = Payment(
            session_id=session_id,
            amount=amount,
            method="credit",
            status="on_account",
        )
        db.add(payment)
        record_debit(
            db,
            tenant_id,
            resolved_customer_id,
            amount,
            session_id,
            f"Session #{session_id} bill on credit",
        )
        db.commit()
        db.refresh(payment)
        return payment

    payment = Payment(
        session_id=session_id,
        amount=amount,
        method=method,
        status=status,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def create_split_payments(
    db: Session,
    session_id: int,
    tenant_id: int,
    payments: list[dict],
) -> list[Payment]:
    """Record multiple payments for one session (split payment). Each item: {amount, method}."""
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        raise ValueError("Session not found")
    result = []
    for p in payments:
        amount = Decimal(str(p["amount"]))
        method = p.get("method", "cash")
        payment = Payment(session_id=session_id, amount=amount, method=method, status="completed")
        db.add(payment)
        result.append(payment)
    db.commit()
    for p in result:
        db.refresh(p)
    return result


def list_payments_by_session(db: Session, session_id: int, tenant_id: int) -> Sequence[Payment]:
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        return []
    return list(session.payments)
