"""
Customer session actions: start, canteen checkout, credit billing.
"""
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.services.session_engine import (
    start_session_with_players,
    get_session_for_tenant,
    end_session,
)
from app.services.billing_service_1 import calculate_bill, apply_total_to_session
from app.services.payment_service import create_payment
from app.services.order_service import create_order, list_orders_by_session, delete_order
from app.services.product_service import list_products
from app.services.customer_account_service import get_account_detail, parse_date_range


def customer_start_session(
    db: Session,
    customer: Customer,
    game_type_id: int,
    game_unit_id: int,
) -> dict:
    players = [{"name": customer.name, "mobile": customer.mobile}]
    session = start_session_with_players(
        db, customer.tenant_id, game_type_id, game_unit_id, players
    )
    return {
        "session_id": session.id,
        "game_type_id": session.game_type_id,
        "game_unit_id": session.game_unit_id,
        "status": session.status,
    }


def customer_get_session_detail(db: Session, customer: Customer, session_id: int) -> dict | None:
    session = get_session_for_tenant(db, session_id, customer.tenant_id)
    if not session:
        return None
    orders = list_orders_by_session(db, session_id, customer.tenant_id)
    return {
        "id": session.id,
        "game_type_id": session.game_type_id,
        "game_unit_id": session.game_unit_id,
        "status": session.status,
        "started_at": session.start_time.isoformat() if session.start_time else None,
        "paused_at": session.paused_at.isoformat() if session.paused_at else None,
        "players": [
            {"id": p.id, "name": p.name, "mobile": p.mobile}
            for p in session.players
        ],
        "orders": [
            {
                "id": o.id,
                "session_id": o.session_id,
                "player_id": o.player_id,
                "product_id": o.product_id,
                "quantity": o.quantity,
                "price": float(o.price),
            }
            for o in orders
        ],
    }


def customer_add_order(
    db: Session,
    customer: Customer,
    session_id: int,
    product_id: int,
    quantity: int,
    player_id: int | None = None,
) -> dict:
    session = get_session_for_tenant(db, session_id, customer.tenant_id)
    if not session:
        raise ValueError("Session not found")
    if session.status not in ("active", "paused"):
        raise ValueError("Session is not active")

    resolved_player_id = player_id
    if resolved_player_id is None:
        if not session.players:
            raise ValueError("No player on session")
        resolved_player_id = session.players[0].id

    order = create_order(
        db,
        session_id,
        resolved_player_id,
        product_id,
        quantity,
        None,
        customer.tenant_id,
    )
    return {
        "id": order.id,
        "session_id": order.session_id,
        "player_id": order.player_id,
        "product_id": order.product_id,
        "quantity": order.quantity,
        "price": float(order.price),
    }


def customer_remove_order(db: Session, customer: Customer, order_id: int) -> bool:
    return delete_order(db, order_id, customer.tenant_id)


def customer_calculate_bill(
    db: Session,
    customer: Customer,
    session_id: int,
    vat_percent: Decimal = Decimal("15"),
    discount_amount: Decimal = Decimal("0"),
) -> dict:
    result = calculate_bill(
        db,
        session_id,
        customer.tenant_id,
        vat_percent=vat_percent,
        discount_amount=discount_amount,
    )
    return {k: float(v) if isinstance(v, Decimal) else v for k, v in result.items()}


def customer_checkout_session(
    db: Session,
    customer: Customer,
    session_id: int,
    payment_method: str,
    vat_percent: Decimal = Decimal("15"),
    discount_amount: Decimal = Decimal("0"),
) -> dict:
    session = get_session_for_tenant(db, session_id, customer.tenant_id)
    if not session:
        raise ValueError("Session not found")
    if session.status not in ("active", "paused"):
        raise ValueError("Session already ended")

    bill = calculate_bill(
        db,
        session_id,
        customer.tenant_id,
        vat_percent=vat_percent,
        discount_amount=discount_amount,
    )
    total = bill["total"]

    method = payment_method.lower()
    if method not in ("credit", "cash", "card"):
        raise ValueError("Invalid payment method")

    if method == "credit":
        create_payment(
            db,
            session_id,
            customer.tenant_id,
            total,
            "credit",
            "on_account",
            customer_id=customer.id,
            customer_name=customer.name,
            customer_mobile=customer.mobile,
        )
    else:
        create_payment(
            db,
            session_id,
            customer.tenant_id,
            total,
            method,
            "completed",
        )

    apply_total_to_session(db, session_id, customer.tenant_id, total)
    ended = end_session(db, session_id, customer.tenant_id)

    return {
        "session_id": ended.id,
        "status": ended.status,
        "total": float(total),
        "payment_method": method,
        "on_account": method == "credit",
    }


def customer_list_products(db: Session, customer: Customer) -> list[dict]:
    items = list_products(db, customer.tenant_id, limit=200)
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": float(p.price),
            "category": p.category,
            "status": p.status,
        }
        for p in items
        if p.status == "active"
    ]


def customer_get_account(
    db: Session,
    customer: Customer,
    start_date=None,
    end_date=None,
) -> dict | None:
    start_dt, end_dt = parse_date_range(start_date, end_date)
    detail = get_account_detail(db, customer.tenant_id, customer.id, start_dt, end_dt)
    if not detail:
        return None
    daily = []
    for day in detail["daily_entries"]:
        daily.append(
            {
                "date": day["date"],
                "debit_total": float(day["debit_total"]),
                "credit_total": float(day["credit_total"]),
                "debits": [
                    {
                        "id": d["id"],
                        "session_id": d["session_id"],
                        "amount": float(d["amount"]),
                        "description": d["description"],
                        "created_at": d["created_at"].isoformat() if d["created_at"] else None,
                    }
                    for d in day["debits"]
                ],
                "credits": [
                    {
                        "id": c["id"],
                        "session_id": c["session_id"],
                        "amount": float(c["amount"]),
                        "description": c["description"],
                        "created_at": c["created_at"].isoformat() if c["created_at"] else None,
                    }
                    for c in day["credits"]
                ],
            }
        )
    return {
        "customer_id": detail["customer_id"],
        "customer_name": detail["customer_name"],
        "mobile": detail["mobile"],
        "balance": float(detail["balance"]),
        "total_debit": float(detail["total_debit"]),
        "total_credit": float(detail["total_credit"]),
        "daily_entries": daily,
    }
