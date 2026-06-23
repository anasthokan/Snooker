"""
Customer account ledger: debit/credit entries, balance, daily reports, settlement.
"""
from collections import defaultdict
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Sequence

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.customer_account import CustomerAccountEntry


def get_or_create_customer(
    db: Session,
    tenant_id: int,
    name: str,
    mobile: str | None = None,
) -> Customer:
    trimmed_mobile = (mobile or "").strip() or None
    if trimmed_mobile:
        existing = (
            db.query(Customer)
            .filter(Customer.tenant_id == tenant_id, Customer.mobile == trimmed_mobile)
            .first()
        )
        if existing:
            return existing
    customer = Customer(tenant_id=tenant_id, name=name.strip(), mobile=trimmed_mobile)
    db.add(customer)
    db.flush()
    return customer


def record_debit(
    db: Session,
    tenant_id: int,
    customer_id: int,
    amount: Decimal,
    session_id: int | None = None,
    description: str | None = None,
) -> CustomerAccountEntry:
    entry = CustomerAccountEntry(
        tenant_id=tenant_id,
        customer_id=customer_id,
        session_id=session_id,
        entry_type="debit",
        amount=amount,
        description=description,
    )
    db.add(entry)
    db.flush()
    return entry


def record_credit(
    db: Session,
    tenant_id: int,
    customer_id: int,
    amount: Decimal,
    description: str | None = None,
) -> CustomerAccountEntry:
    entry = CustomerAccountEntry(
        tenant_id=tenant_id,
        customer_id=customer_id,
        session_id=None,
        entry_type="credit",
        amount=amount,
        description=description,
    )
    db.add(entry)
    db.flush()
    return entry


def _sum_entries(
    db: Session,
    tenant_id: int,
    customer_id: int,
    entry_type: str,
    start: datetime | None = None,
    end: datetime | None = None,
) -> Decimal:
    q = db.query(func.coalesce(func.sum(CustomerAccountEntry.amount), 0)).filter(
        CustomerAccountEntry.tenant_id == tenant_id,
        CustomerAccountEntry.customer_id == customer_id,
        CustomerAccountEntry.entry_type == entry_type,
    )
    if start:
        q = q.filter(CustomerAccountEntry.created_at >= start)
    if end:
        q = q.filter(CustomerAccountEntry.created_at <= end)
    return Decimal(str(q.scalar() or 0))


def get_balance(
    db: Session,
    tenant_id: int,
    customer_id: int,
    start: datetime | None = None,
    end: datetime | None = None,
) -> Decimal:
    debits = _sum_entries(db, tenant_id, customer_id, "debit", start, end)
    credits = _sum_entries(db, tenant_id, customer_id, "credit", start, end)
    return debits - credits


def list_entries(
    db: Session,
    tenant_id: int,
    customer_id: int,
    start: datetime | None = None,
    end: datetime | None = None,
) -> Sequence[CustomerAccountEntry]:
    q = (
        db.query(CustomerAccountEntry)
        .filter(
            CustomerAccountEntry.tenant_id == tenant_id,
            CustomerAccountEntry.customer_id == customer_id,
        )
        .order_by(CustomerAccountEntry.created_at.desc())
    )
    if start:
        q = q.filter(CustomerAccountEntry.created_at >= start)
    if end:
        q = q.filter(CustomerAccountEntry.created_at <= end)
    return q.all()


def build_daily_report(
    entries: Sequence[CustomerAccountEntry],
) -> list[dict]:
    by_date: dict[str, dict] = defaultdict(
        lambda: {"date": "", "debits": [], "credits": [], "debit_total": Decimal("0"), "credit_total": Decimal("0")}
    )
    for entry in entries:
        day = entry.created_at.date().isoformat() if entry.created_at else date.today().isoformat()
        row = by_date[day]
        row["date"] = day
        item = {
            "id": entry.id,
            "session_id": entry.session_id,
            "amount": entry.amount,
            "description": entry.description or "",
            "created_at": entry.created_at,
        }
        if entry.entry_type == "debit":
            row["debits"].append(item)
            row["debit_total"] += entry.amount
        else:
            row["credits"].append(item)
            row["credit_total"] += entry.amount
    return sorted(by_date.values(), key=lambda x: x["date"], reverse=True)


def search_customers_with_balance(
    db: Session,
    tenant_id: int,
    query: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    only_with_balance: bool = False,
) -> list[dict]:
    customers_q = db.query(Customer).filter(Customer.tenant_id == tenant_id)
    if query and query.strip():
        q = query.strip()
        filters = [
            Customer.name.ilike(f"%{q}%"),
            Customer.mobile.ilike(f"%{q}%"),
        ]
        if q.isdigit():
            filters.append(Customer.id == int(q))
        customers_q = customers_q.filter(or_(*filters))
    customers = customers_q.order_by(Customer.name).all()

    results = []
    for customer in customers:
        balance = get_balance(db, tenant_id, customer.id, start, end)
        if only_with_balance and balance <= 0:
            continue
        results.append(
            {
                "customer_id": customer.id,
                "name": customer.name,
                "mobile": customer.mobile,
                "balance": balance,
            }
        )
    return results


def get_account_detail(
    db: Session,
    tenant_id: int,
    customer_id: int,
    start: datetime | None = None,
    end: datetime | None = None,
) -> dict | None:
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.tenant_id == tenant_id)
        .first()
    )
    if not customer:
        return None
    entries = list_entries(db, tenant_id, customer_id, start, end)
    total_debit = sum((e.amount for e in entries if e.entry_type == "debit"), Decimal("0"))
    total_credit = sum((e.amount for e in entries if e.entry_type == "credit"), Decimal("0"))
    return {
        "customer_id": customer.id,
        "customer_name": customer.name,
        "mobile": customer.mobile,
        "balance": total_debit - total_credit,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "daily_entries": build_daily_report(entries),
    }


def parse_date_range(start_date: date | None, end_date: date | None) -> tuple[datetime | None, datetime | None]:
    start_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc) if start_date else None
    end_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc) if end_date else None
    return start_dt, end_dt
