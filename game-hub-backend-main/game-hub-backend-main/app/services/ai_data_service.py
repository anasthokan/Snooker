"""
AI Data Service - READ-ONLY access for AI/ML.

Per documentation: AI will use Sessions data, Revenue data, Player data.
AI will have read-only DB access.
Future features: Demand prediction, Fraud detection, Smart pricing.
"""
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.session import Session as SessionModel
from app.models.payment import Payment
from app.models.order import PlayerOrder
from app.models.game_type import GameType
from app.models.game_unit import GameUnit
from app.services.session_engine import compute_duration_seconds
from app.services.billing_service import _get_rate_for_session


def get_sessions_data(
    db: Session,
    tenant_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 1000,
) -> list[dict[str, Any]]:
    """
    Read-only: sessions data for AI (demand prediction, utilization).
    All queries filter by tenant_id.
    """
    if end_date is None:
        end_date = date.today()
    if start_date is None:
        start_date = end_date - timedelta(days=90)
    start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
        )
        .order_by(SessionModel.start_time.desc())
        .limit(limit)
        .all()
    )
    out = []
    for s in sessions:
        duration_seconds = compute_duration_seconds(s) if s.status == "ended" else 0
        rate = _get_rate_for_session(db, s) or Decimal("0")
        out.append({
            "id": s.id,
            "tenant_id": s.tenant_id,
            "game_type_id": s.game_type_id,
            "game_unit_id": s.game_unit_id,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "paused_seconds": s.paused_seconds,
            "status": s.status,
            "total_charge": float(s.total_charge) if s.total_charge is not None else None,
            "duration_seconds": duration_seconds,
            "rate_used": float(rate),
        })
    return out


def get_revenue_data(
    db: Session,
    tenant_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 1000,
) -> list[dict[str, Any]]:
    """
    Read-only: revenue data for AI (demand prediction, smart pricing).
    Aggregates from payments and sessions; filter by tenant_id.
    """
    if end_date is None:
        end_date = date.today()
    if start_date is None:
        start_date = end_date - timedelta(days=90)
    start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status == "ended",
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
        )
        .order_by(SessionModel.start_time.desc())
        .limit(limit)
        .all()
    )
    out = []
    for s in sessions:
        duration = compute_duration_seconds(s)
        rate = _get_rate_for_session(db, s) or Decimal("0")
        hours = Decimal(duration) / Decimal("3600")
        game_charge = float((hours * rate).quantize(Decimal("0.01")))
        orders = db.query(PlayerOrder).filter(PlayerOrder.session_id == s.id).all()
        canteen_charge = float(sum((o.price * o.quantity for o in orders), Decimal("0")).quantize(Decimal("0.01")))
        payments = db.query(Payment).filter(Payment.session_id == s.id).all()
        total_paid = float(sum(p.amount for p in payments))
        out.append({
            "session_id": s.id,
            "tenant_id": s.tenant_id,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "game_charge": game_charge,
            "canteen_charge": canteen_charge,
            "total_charge": float(s.total_charge) if s.total_charge is not None else None,
            "total_paid": total_paid,
            "duration_seconds": duration,
            "rate_used": float(rate),
        })
    return out


def get_player_data(
    db: Session,
    tenant_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 1000,
) -> list[dict[str, Any]]:
    """
    Read-only: player data for AI (fraud detection, player spend, demand).
    Sessions + session_players + orders; filter by tenant_id.
    """
    if end_date is None:
        end_date = date.today()
    if start_date is None:
        start_date = end_date - timedelta(days=90)
    start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
        )
        .order_by(SessionModel.start_time.desc())
        .limit(limit)
        .all()
    )
    out = []
    for s in sessions:
        duration = compute_duration_seconds(s) if s.status == "ended" else 0
        rate = _get_rate_for_session(db, s) or Decimal("0")
        hours = Decimal(duration) / Decimal("3600")
        game_charge = float((hours * rate).quantize(Decimal("0.01")))
        for p in s.players:
            order_total = float(sum((o.price * o.quantity for o in p.orders), Decimal("0")).quantize(Decimal("0.01")))
            out.append({
                "session_id": s.id,
                "tenant_id": s.tenant_id,
                "player_id": p.id,
                "player_name": p.name,
                "mobile": p.mobile,
                "membership_id": p.membership_id,
                "session_start": s.start_time.isoformat() if s.start_time else None,
                "session_end": s.end_time.isoformat() if s.end_time else None,
                "session_status": s.status,
                "game_charge": game_charge,
                "canteen_charge": order_total,
                "total_spend": game_charge + order_total,
            })
    return out
