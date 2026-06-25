"""Repayment service: record and list outgoing business payments."""
from datetime import date
from typing import Sequence

from sqlalchemy.orm import Session

from app.models.repayment import REPAYMENT_CATEGORIES, Repayment
from app.schemas.repayment import RepaymentCreate, RepaymentUpdate


def _validate_category(category: str) -> str:
    normalized = category.strip().lower()
    if normalized not in REPAYMENT_CATEGORIES:
        allowed = ", ".join(REPAYMENT_CATEGORIES)
        raise ValueError(f"Invalid category. Allowed: {allowed}")
    return normalized


def create_repayment(db: Session, data: RepaymentCreate, tenant_id: int) -> Repayment:
    entry = Repayment(
        tenant_id=tenant_id,
        category=_validate_category(data.category),
        amount=data.amount,
        paid_at=data.paid_at,
        notes=data.notes.strip() if data.notes else None,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_repayments(
    db: Session,
    tenant_id: int,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
    skip: int = 0,
    limit: int = 200,
) -> Sequence[Repayment]:
    q = db.query(Repayment).filter(Repayment.tenant_id == tenant_id)
    if start_date:
        q = q.filter(Repayment.paid_at >= start_date)
    if end_date:
        q = q.filter(Repayment.paid_at <= end_date)
    if category:
        q = q.filter(Repayment.category == _validate_category(category))
    return q.order_by(Repayment.paid_at.desc(), Repayment.id.desc()).offset(skip).limit(limit).all()


def get_repayment(db: Session, repayment_id: int, tenant_id: int) -> Repayment | None:
    return (
        db.query(Repayment)
        .filter(Repayment.id == repayment_id, Repayment.tenant_id == tenant_id)
        .first()
    )


def update_repayment(db: Session, entry: Repayment, data: RepaymentUpdate) -> Repayment:
    if data.category is not None:
        entry.category = _validate_category(data.category)
    if data.amount is not None:
        entry.amount = data.amount
    if data.paid_at is not None:
        entry.paid_at = data.paid_at
    if data.notes is not None:
        entry.notes = data.notes.strip() or None
    db.commit()
    db.refresh(entry)
    return entry


def delete_repayment(db: Session, entry: Repayment) -> None:
    db.delete(entry)
    db.commit()
