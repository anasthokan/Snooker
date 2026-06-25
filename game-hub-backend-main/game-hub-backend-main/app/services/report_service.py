"""
Report service (v2): full copy of report_service plus new helpers for:
- Customer date-wise credit
- Table utilization (dashboard)
- Top canteen items (dashboard)

Use this as the versioned implementation that can replace `report_service.py` on the server.
"""
from collections import defaultdict
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.session import Session as SessionModel, SessionPlayer
from app.models.order import PlayerOrder
from app.models.game_unit import GameUnit
from app.models.game_type import GameType
from app.models.product import Product
from app.models.payment import Payment
from app.models.canteen_bill import CanteenBill, CanteenBillItem
from app.services.session_engine import compute_duration_seconds
from app.services.billing_service import calculate_bill, _get_rate_for_session


WEEKEND_WEEKDAYS = {3: "Thursday", 4: "Friday", 5: "Saturday"}
DEFAULT_VAT_PERCENT = Decimal("15")


def _resolve_session_charge(
    db: Session,
    session: SessionModel,
    tenant_id: int,
) -> Decimal:
    """Use stored total_charge, else payments sum, else calculated bill total."""
    if session.total_charge is not None and session.total_charge > 0:
        return session.total_charge

    if session.payments:
        paid = sum(
            (
                p.amount
                for p in session.payments
                if p.status in ("completed", "on_account")
            ),
            Decimal("0"),
        ).quantize(Decimal("0.01"))
        if paid > 0:
            return paid

    try:
        breakdown = calculate_bill(
            db,
            session.id,
            tenant_id,
            vat_percent=DEFAULT_VAT_PERCENT,
            discount_amount=Decimal("0"),
        )
        return breakdown.get("total", Decimal("0"))
    except Exception:
        return Decimal("0")


def _session_revenue_date(session: SessionModel) -> date | None:
    """Attribute revenue to the day the session was closed (or started)."""
    anchor = session.end_time or session.start_time
    return anchor.date() if anchor else None


def _player_group_key(player: SessionPlayer) -> str:
    """Group repeat visits by customer name (case-insensitive)."""
    name = (player.name or "").strip()
    if name:
        return name.lower()
    if player.mobile:
        return f"mobile:{player.mobile.strip()}"
    return f"player:{player.id}"


def _date_range_for_period(
    period: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> tuple[date, date]:
    """Return (start_date, end_date) for daily/weekly/monthly; for custom use provided start/end."""
    today = date.today()
    if period == "daily":
        return today, today
    if period == "weekly":
        start = today - timedelta(days=today.weekday())
        return start, today
    if period == "monthly":
        start = today.replace(day=1)
        return start, today
    # custom
    end_date = end_date or today
    start_date = start_date or (end_date - timedelta(days=30))
    return start_date, end_date


def summary_report(
    db: Session,
    tenant_id: int,
    period: str = "daily",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    """Summary: total revenue, game/canteen, session count, bill count for period."""
    start_d, end_d = _date_range_for_period(period, start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status == "ended",
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
        )
        .all()
    )
    total_revenue = Decimal("0")
    game_revenue = Decimal("0")
    for s in sessions:
        total_charge = s.total_charge or Decimal("0")
        total_revenue += total_charge
        duration = compute_duration_seconds(s)
        rate = _get_rate_for_session(db, s) or Decimal("0")
        hours = Decimal(duration) / Decimal("3600")
        game_revenue += (hours * rate).quantize(Decimal("0.01"))
    canteen_revenue = total_revenue - game_revenue
    if canteen_revenue < 0:
        canteen_revenue = Decimal("0")

    return {
        "period": period,
        "start_date": start_d,
        "end_date": end_d,
        "total_revenue": total_revenue,
        "game_revenue": game_revenue,
        "canteen_revenue": canteen_revenue,
        "session_count": len(sessions),
        "bill_count": len(sessions),
    }


def bills_report(
    db: Session,
    tenant_id: int,
    period: str = "daily",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    """List of bills (sessions) in period with total, game, canteen, vat."""
    start_d, end_d = _date_range_for_period(period, start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status == "ended",
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
        )
        .all()
    )
    bills = []
    total_amount = Decimal("0")
    vat_percent = Decimal("15")
    for s in sessions:
        try:
            breakdown = calculate_bill(db, s.id, tenant_id, vat_percent=vat_percent)
        except Exception:
            breakdown = {
                "game_charge": Decimal("0"),
                "canteen_charge": Decimal("0"),
                "vat_amount": Decimal("0"),
                "total": s.total_charge or Decimal("0"),
            }
        total = breakdown.get("total", s.total_charge or Decimal("0"))
        total_amount += total
        bills.append({
            "session_id": s.id,
            "total": total,
            "game_charge": breakdown.get("game_charge", Decimal("0")),
            "canteen_charge": breakdown.get("canteen_charge", Decimal("0")),
            "vat_amount": breakdown.get("vat_amount", Decimal("0")),
            "end_time": s.end_time,
        })
    return {
        "period": period,
        "start_date": start_d,
        "end_date": end_d,
        "bills": bills,
        "total_amount": total_amount,
    }


def customer_report(
    db: Session,
    tenant_id: int,
    period: str = "daily",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    """Customer/player spend in period."""
    start_d, end_d = _date_range_for_period(period, start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status == "ended",
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
        )
        .all()
    )
    by_player: dict[str, dict] = {}
    for s in sessions:
        duration = compute_duration_seconds(s)
        rate = _get_rate_for_session(db, s) or Decimal("0")
        hours = Decimal(duration) / Decimal("3600")
        game_charge = (hours * rate).quantize(Decimal("0.01"))
        for p in s.players:
            order_total = sum((o.price * o.quantity for o in p.orders), Decimal("0")).quantize(Decimal("0.01"))
            key = _player_group_key(p)
            if key not in by_player:
                by_player[key] = {
                    "player_id": p.id,
                    "player_name": (p.name or "").strip() or f"Player {p.id}",
                    "session_count": 0,
                    "total_spend": Decimal("0"),
                    "game_charge": Decimal("0"),
                    "canteen_charge": Decimal("0"),
                }
            by_player[key]["session_count"] += 1
            by_player[key]["total_spend"] += game_charge + order_total
            by_player[key]["game_charge"] += game_charge
            by_player[key]["canteen_charge"] += order_total
    return {
        "period": period,
        "start_date": start_d,
        "end_date": end_d,
        "customers": list(by_player.values()),
    }


def game_unit_report(
    db: Session,
    tenant_id: int,
    period: str = "daily",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    """Revenue by game unit in period."""
    start_d, end_d = _date_range_for_period(period, start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status == "ended",
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
        )
        .all()
    )
    by_unit: dict[int, dict] = {}
    for s in sessions:
        gu = db.query(GameUnit).filter(GameUnit.id == s.game_unit_id).first()
        gt = db.query(GameType).filter(GameType.id == s.game_type_id).first() if s.game_type_id else None
        total_charge = s.total_charge or Decimal("0")
        if s.game_unit_id not in by_unit:
            by_unit[s.game_unit_id] = {
                "game_unit_id": s.game_unit_id,
                "unit_name": gu.unit_name if gu else str(s.game_unit_id),
                "game_type_name": gt.name if gt else "",
                "revenue": Decimal("0"),
                "session_count": 0,
            }
        by_unit[s.game_unit_id]["revenue"] += total_charge
        by_unit[s.game_unit_id]["session_count"] += 1
    return {
        "period": period,
        "start_date": start_d,
        "end_date": end_d,
        "units": list(by_unit.values()),
    }


def products_report(
    db: Session,
    tenant_id: int,
    period: str = "daily",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    """Canteen product sales in period."""
    start_d, end_d = _date_range_for_period(period, start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    orders = (
        db.query(PlayerOrder)
        .join(SessionModel, PlayerOrder.session_id == SessionModel.id)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status == "ended",
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
        )
        .all()
    )
    walk_in_items = (
        db.query(CanteenBillItem)
        .join(CanteenBill, CanteenBillItem.canteen_bill_id == CanteenBill.id)
        .filter(
            CanteenBill.tenant_id == tenant_id,
            CanteenBill.created_at >= start_dt,
            CanteenBill.created_at <= end_dt,
        )
        .all()
    )
    by_product: dict[int, dict] = {}
    for o in orders:
        prod = db.query(Product).filter(Product.id == o.product_id).first()
        rev = (o.price * o.quantity).quantize(Decimal("0.01"))
        if o.product_id not in by_product:
            by_product[o.product_id] = {
                "product_id": o.product_id,
                "product_name": prod.name if prod else str(o.product_id),
                "quantity_sold": 0,
                "revenue": Decimal("0"),
            }
        by_product[o.product_id]["quantity_sold"] += o.quantity
        by_product[o.product_id]["revenue"] += rev
    for item in walk_in_items:
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        rev = (item.price * item.quantity).quantize(Decimal("0.01"))
        if item.product_id not in by_product:
            by_product[item.product_id] = {
                "product_id": item.product_id,
                "product_name": prod.name if prod else str(item.product_id),
                "quantity_sold": 0,
                "revenue": Decimal("0"),
            }
        by_product[item.product_id]["quantity_sold"] += item.quantity
        by_product[item.product_id]["revenue"] += rev
    return {
        "period": period,
        "start_date": start_d,
        "end_date": end_d,
        "products": list(by_product.values()),
    }


def collective_report(
    db: Session,
    tenant_id: int,
    period: str = "daily",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    """Combined: revenue + utilization + top game units + top products."""
    summ = summary_report(db, tenant_id, period, start_date, end_date)
    start_d, end_d = summ["start_date"], summ["end_date"]
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    total_units = db.query(GameUnit).filter(GameUnit.tenant_id == tenant_id, GameUnit.status.in_(["active", "available"])).count()
    utilized = (
        db.query(SessionModel.game_unit_id)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
        )
        .distinct()
        .count()
    )
    utilization_percent = (utilized / total_units * 100) if total_units else 0.0

    units_data = game_unit_report(db, tenant_id, period, start_date, end_date)
    top_units = sorted(units_data["units"], key=lambda x: x["revenue"], reverse=True)[:10]
    products_data = products_report(db, tenant_id, period, start_date, end_date)
    top_products = sorted(products_data["products"], key=lambda x: x["revenue"], reverse=True)[:10]

    return {
        "period": period,
        "start_date": start_d,
        "end_date": end_d,
        "total_revenue": summ["total_revenue"],
        "game_revenue": summ["game_revenue"],
        "canteen_revenue": summ["canteen_revenue"],
        "session_count": summ["session_count"],
        "utilization_percent": round(utilization_percent, 2),
        "top_game_units": top_units,
        "top_products": top_products,
    }


# ---- Wrappers used by reports API (v1 compatibility) ----


def revenue_report(
    db: Session,
    tenant_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    game_type_id: int | None = None,
    game_unit_id: int | None = None,
) -> dict:
    """
    Revenue summary for /reports/revenue.
    """
    start_d, end_d = _date_range_for_period("custom", start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    q = db.query(SessionModel).filter(
        SessionModel.tenant_id == tenant_id,
        SessionModel.status == "ended",
        SessionModel.start_time >= start_dt,
        SessionModel.start_time <= end_dt,
    )
    if game_type_id is not None:
        q = q.filter(SessionModel.game_type_id == game_type_id)
    if game_unit_id is not None:
        q = q.filter(SessionModel.game_unit_id == game_unit_id)

    sessions = q.all()
    total_revenue = Decimal("0")
    game_revenue = Decimal("0")
    for s in sessions:
        total_charge = s.total_charge or Decimal("0")
        total_revenue += total_charge
        duration = compute_duration_seconds(s)
        rate = _get_rate_for_session(db, s) or Decimal("0")
        hours = Decimal(duration) / Decimal("3600")
        game_revenue += (hours * rate).quantize(Decimal("0.01"))
    canteen_revenue = total_revenue - game_revenue
    if canteen_revenue < 0:
        canteen_revenue = Decimal("0")

    return {
        "total_revenue": total_revenue,
        "game_revenue": game_revenue,
        "canteen_revenue": canteen_revenue,
        "period_start": start_d,
        "period_end": end_d,
        "session_count": len(sessions),
    }


def utilization_report(
    db: Session,
    tenant_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    game_type_id: int | None = None,
    game_unit_id: int | None = None,
) -> dict:
    """
    Utilization summary for /reports/utilization.
    """
    start_d, end_d = _date_range_for_period("custom", start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    total_units_q = db.query(GameUnit).filter(
        GameUnit.tenant_id == tenant_id,
        GameUnit.status.in_(["active", "available"]),
    )
    if game_type_id is not None:
        total_units_q = total_units_q.filter(GameUnit.game_type_id == game_type_id)
    total_units = total_units_q.count()

    sessions_q = db.query(SessionModel).filter(
        SessionModel.tenant_id == tenant_id,
        SessionModel.start_time >= start_dt,
        SessionModel.start_time <= end_dt,
    )
    if game_type_id is not None:
        sessions_q = sessions_q.filter(SessionModel.game_type_id == game_type_id)
    if game_unit_id is not None:
        sessions_q = sessions_q.filter(SessionModel.game_unit_id == game_unit_id)
    sessions = sessions_q.all()

    utilized_units = len({s.game_unit_id for s in sessions})
    utilization_percent = (utilized_units / total_units * 100) if total_units else 0.0

    by_game_type: dict[int, dict] = {}
    for s in sessions:
        if s.game_type_id is None:
            continue
        gt = db.query(GameType).filter(GameType.id == s.game_type_id).first()
        key = s.game_type_id
        if key not in by_game_type:
            by_game_type[key] = {
                "game_type_id": key,
                "game_type_name": gt.name if gt else "",
                "session_count": 0,
            }
        by_game_type[key]["session_count"] += 1

    return {
        "total_units": total_units,
        "utilized_units": utilized_units,
        "utilization_percent": utilization_percent,
        "period_start": start_d,
        "period_end": end_d,
        "by_game_type": list(by_game_type.values()),
    }


def player_spend_report(
    db: Session,
    tenant_id: int,
    session_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    game_type_id: int | None = None,
    game_unit_id: int | None = None,
) -> list[dict]:
    """
    Data for /reports/player-spend.
    One row per session/player with game + canteen spend.
    """
    start_d, end_d = _date_range_for_period("custom", start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    q = db.query(SessionModel).filter(
        SessionModel.tenant_id == tenant_id,
        SessionModel.status == "ended",
        SessionModel.start_time >= start_dt,
        SessionModel.start_time <= end_dt,
    )
    if session_id is not None:
        q = q.filter(SessionModel.id == session_id)
    if game_type_id is not None:
        q = q.filter(SessionModel.game_type_id == game_type_id)
    if game_unit_id is not None:
        q = q.filter(SessionModel.game_unit_id == game_unit_id)

    sessions = q.all()
    out: list[dict] = []
    for s in sessions:
        duration = compute_duration_seconds(s)
        rate = _get_rate_for_session(db, s) or Decimal("0")
        hours = Decimal(duration) / Decimal("3600")
        game_charge = (hours * rate).quantize(Decimal("0.01"))
        for p in s.players:
            order_total = sum((o.price * o.quantity for o in p.orders), Decimal("0")).quantize(Decimal("0.01"))
            out.append(
                {
                    "player_name": p.name,
                    "player_id": p.id,
                    "session_id": s.id,
                    "total_spend": game_charge + order_total,
                    "game_charge": game_charge,
                    "canteen_charge": order_total,
                    "session_start": s.start_time,
                    "session_end": s.end_time,
                }
            )
    return out


def revenue_by_game_type_report(
    db: Session,
    tenant_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict]:
    """
    Data for /reports/revenue-by-game-type.
    """
    start_d, end_d = _date_range_for_period("custom", start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status == "ended",
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
        )
        .all()
    )

    by_type: dict[int, dict] = {}
    for s in sessions:
        if s.game_type_id is None:
            continue
        gt = db.query(GameType).filter(GameType.id == s.game_type_id).first()
        total_charge = s.total_charge or Decimal("0")
        key = s.game_type_id
        if key not in by_type:
            by_type[key] = {
                "game_type_id": key,
                "game_type_name": gt.name if gt else "",
                "revenue": Decimal("0"),
                "session_count": 0,
            }
        by_type[key]["revenue"] += total_charge
        by_type[key]["session_count"] += 1
    return list(by_type.values())


def revenue_by_hour_report(
    db: Session,
    tenant_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict]:
    """
    Data for /reports/revenue-by-hour.
    """
    start_d, end_d = _date_range_for_period("custom", start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status == "ended",
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
        )
        .all()
    )

    by_hour: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    for s in sessions:
        if not s.start_time:
            continue
        hour = s.start_time.hour
        total_charge = s.total_charge or Decimal("0")
        by_hour[hour] += total_charge

    return [
        {"hour": h, "revenue": float(v)}
        for h, v in sorted(by_hour.items(), key=lambda kv: kv[0])
    ]


# ---- New helpers (v2 extras) ----


def customer_credit_by_date_report(
    db: Session,
    tenant_id: int,
    player_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    vat_percent: Decimal = Decimal("15"),
) -> dict:
    """
    Date-wise credit details for a specific customer/player.

    For the given player_id:
    - Fetch all ended sessions in the date range for the tenant.
    - For each session, compute bill total (game + canteen + VAT).
    - Subtract completed payments to get outstanding credit.
    - Group by calendar date and sum outstanding amounts.
    """
    start_d, end_d = _date_range_for_period("custom", start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        db.query(SessionModel)
        .join(SessionPlayer, SessionPlayer.session_id == SessionModel.id)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status == "ended",
            SessionModel.start_time >= start_dt,
            SessionModel.start_time <= end_dt,
            SessionPlayer.id == player_id,
        )
        .all()
    )

    per_date: dict[date, dict] = {}
    days_played: set[date] = set()
    total_credit = Decimal("0")

    for s in sessions:
        if not s.start_time:
            continue
        session_date = s.start_time.date()
        days_played.add(session_date)

        breakdown = calculate_bill(
            db,
            s.id,
            tenant_id,
            vat_percent=vat_percent,
            discount_amount=Decimal("0"),
        )
        total = breakdown.get("total", Decimal("0"))

        payments = (
            db.query(Payment)
            .filter(
                Payment.session_id == s.id,
                Payment.status == "completed",
            )
            .all()
        )
        paid_amount = sum((p.amount for p in payments), Decimal("0"))

        credit = (total - paid_amount).quantize(Decimal("0.01"))
        if credit < 0:
            credit = Decimal("0")

        if session_date not in per_date:
            per_date[session_date] = {
                "date": session_date,
                "amount": Decimal("0"),
                "paid": True,
            }

        per_date[session_date]["amount"] += credit
        if credit > 0:
            per_date[session_date]["paid"] = False

        total_credit += credit

    items = sorted(per_date.values(), key=lambda x: x["date"])

    return {
        "customer_id": player_id,
        "period_start": start_d,
        "period_end": end_d,
        "items": items,
        "total_days_played": len(days_played),
        "total_credit_amount": total_credit,
    }


def table_utilization_report(
    db: Session,
    tenant_id: int,
    period: str = "daily",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    """
    Table (game unit) utilization data for dashboard charts.

    Reuses collective_report + game_unit_report:
    - overall utilization_percent
    - per-unit revenue and session_count.
    """
    collective = collective_report(
        db, tenant_id, period=period, start_date=start_date, end_date=end_date
    )
    start_d = collective["start_date"]
    end_d = collective["end_date"]

    units_data = game_unit_report(
        db, tenant_id, period=period, start_date=start_d, end_date=end_d
    )

    return {
        "period": period,
        "start_date": start_d,
        "end_date": end_d,
        "utilization_percent": collective["utilization_percent"],
        "units": units_data["units"],
    }


def profitability_report(
    db: Session,
    tenant_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    """
    Profitability breakdown: revenue per day, weekend (Thu–Sat), customers, canteen.
    """
    start_d, end_d = _date_range_for_period("custom", start_date, end_date)
    start_dt = datetime.combine(start_d, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_d, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status == "ended",
            SessionModel.end_time.isnot(None),
            SessionModel.end_time >= start_dt,
            SessionModel.end_time <= end_dt,
        )
        .all()
    )

    by_date: dict[date, Decimal] = defaultdict(lambda: Decimal("0"))
    weekend_by_weekday: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    total_revenue = Decimal("0")
    game_revenue = Decimal("0")

    for s in sessions:
        charge = _resolve_session_charge(db, s, tenant_id)
        if charge <= 0:
            continue
        total_revenue += charge
        duration = compute_duration_seconds(s)
        rate = _get_rate_for_session(db, s) or Decimal("0")
        hours = Decimal(duration) / Decimal("3600")
        game_revenue += (hours * rate).quantize(Decimal("0.01"))

        session_date = _session_revenue_date(s)
        if not session_date:
            continue
        by_date[session_date] += charge
        weekday = session_date.weekday()
        if weekday in WEEKEND_WEEKDAYS:
            weekend_by_weekday[weekday] += charge

    walk_in_bills = (
        db.query(CanteenBill)
        .filter(
            CanteenBill.tenant_id == tenant_id,
            CanteenBill.created_at >= start_dt,
            CanteenBill.created_at <= end_dt,
        )
        .all()
    )
    for bill in walk_in_bills:
        bill_total = sum(
            (item.price * item.quantity for item in bill.items),
            Decimal("0"),
        ).quantize(Decimal("0.01"))
        if bill_total <= 0:
            continue
        total_revenue += bill_total
        bill_date = bill.created_at.date() if bill.created_at else start_d
        by_date[bill_date] += bill_total
        weekday = bill_date.weekday()
        if weekday in WEEKEND_WEEKDAYS:
            weekend_by_weekday[weekday] += bill_total

    canteen_revenue = total_revenue - game_revenue
    if canteen_revenue < 0:
        canteen_revenue = Decimal("0")

    revenue_by_day = [
        {"date": d, "revenue": rev}
        for d, rev in sorted(by_date.items(), key=lambda kv: kv[0])
    ]
    ranked_days = sorted(revenue_by_day, key=lambda x: x["revenue"], reverse=True)
    revenue_by_day_ranked = [
        {"rank": i, "date": row["date"], "revenue": row["revenue"]}
        for i, row in enumerate(ranked_days, start=1)
    ]

    weekend_breakdown = [
        {
            "day_name": WEEKEND_WEEKDAYS[wd],
            "weekday": wd,
            "revenue": weekend_by_weekday.get(wd, Decimal("0")),
        }
        for wd in sorted(WEEKEND_WEEKDAYS)
    ]
    weekend_revenue = sum(
        (row["revenue"] for row in weekend_breakdown),
        Decimal("0"),
    )

    customer_data = customer_report(
        db, tenant_id, period="custom", start_date=start_d, end_date=end_d
    )
    customers = sorted(
        customer_data["customers"],
        key=lambda c: c["total_spend"],
        reverse=True,
    )
    customers_ranked = [
        {
            "rank": i,
            "player_id": c["player_id"],
            "player_name": c["player_name"],
            "session_count": c["session_count"],
            "total_spend": c["total_spend"],
            "game_charge": c["game_charge"],
            "canteen_charge": c["canteen_charge"],
        }
        for i, c in enumerate(customers, start=1)
    ]

    products_data = products_report(
        db, tenant_id, period="custom", start_date=start_d, end_date=end_d
    )
    canteen_products = sorted(
        products_data["products"],
        key=lambda p: p["revenue"],
        reverse=True,
    )

    return {
        "start_date": start_d,
        "end_date": end_d,
        "total_revenue": total_revenue,
        "weekend_revenue": weekend_revenue,
        "canteen_revenue": canteen_revenue,
        "game_revenue": game_revenue,
        "revenue_by_day": revenue_by_day,
        "revenue_by_day_ranked": revenue_by_day_ranked,
        "weekend_breakdown": weekend_breakdown,
        "customers": customers_ranked,
        "canteen_products": canteen_products,
    }


def top_canteen_items_report(
    db: Session,
    tenant_id: int,
    period: str = "daily",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 5,
) -> dict:
    """
    Top N canteen items by revenue for dashboard charts.
    """
    products_data = products_report(
        db, tenant_id, period=period, start_date=start_date, end_date=end_date
    )
    start_d = products_data["start_date"]
    end_d = products_data["end_date"]
    products = sorted(
        products_data["products"], key=lambda x: x["revenue"], reverse=True
    )[:limit]

    return {
        "period": period,
        "start_date": start_d,
        "end_date": end_d,
        "items": products,
    }

