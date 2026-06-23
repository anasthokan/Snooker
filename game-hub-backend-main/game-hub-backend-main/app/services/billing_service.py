"""
Billing: calculate session bill. Game + Canteen + VAT - Discount.
Rate from GameUnit (weekday/weekend per hour); duration from session engine.
"""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.session import Session as SessionModel
from app.models.game_unit import GameUnit
from app.models.order import PlayerOrder
from app.models.product import Product
from app.services.session_engine import get_session_for_tenant, compute_duration_seconds


def _get_rate_for_session(db: Session, session: SessionModel) -> Optional[Decimal]:
    """Resolve per-hour rate: weekend_price on Sat/Sun, else weekday_price. special_price not used here."""
    gu = db.query(GameUnit).filter(GameUnit.id == session.game_unit_id).first()
    if not gu:
        return None
    # Use session start_time for day-of-week
    start = session.start_time
    if start.weekday() >= 5:  # 5=Saturday, 6=Sunday
        return gu.weekend_price
    return gu.weekday_price


def calculate_bill(
    db: Session,
    session_id: int,
    tenant_id: int,
    vat_percent: Decimal = Decimal("0"),
    discount_amount: Decimal = Decimal("0"),
) -> dict:
    """
    Compute bill for session.
    Game charge = (duration_seconds / 3600) * rate_per_hour
    Canteen = sum of order line totals (quantity * price)
    Subtotal = game + canteen; VAT; Total = subtotal + vat - discount.
    """
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        raise ValueError("Session not found")
    duration_seconds = compute_duration_seconds(session)
    rate = _get_rate_for_session(db, session)
    if rate is None:
        rate = Decimal("0")
    hours = Decimal(duration_seconds) / Decimal("3600")
    game_charge = (hours * rate).quantize(Decimal("0.01"))

    orders = db.query(PlayerOrder).filter(PlayerOrder.session_id == session_id).all()
    canteen_charge = sum((o.price * o.quantity for o in orders), Decimal("0")).quantize(Decimal("0.01"))

    subtotal = game_charge + canteen_charge
    vat_amount = (subtotal * vat_percent / Decimal("100")).quantize(Decimal("0.01"))
    total = (subtotal + vat_amount - discount_amount).quantize(Decimal("0.01"))

    return {
        "game_charge": game_charge,
        "canteen_charge": canteen_charge,
        "subtotal": subtotal,
        "vat_percent": vat_percent,
        "vat_amount": vat_amount,
        "discount_amount": discount_amount,
        "total": total,
        "duration_seconds": duration_seconds,
        "rate_used": rate,
    }


def apply_total_to_session(db: Session, session_id: int, tenant_id: int, total: Decimal) -> None:
    """Store total_charge on session after billing."""
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        raise ValueError("Session not found")
    session.total_charge = total
    db.commit()
