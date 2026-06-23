"""
Order service v1: create order (player or walk-in), list by session, delete order.
Supports optional session_id/player_id for player orders; walk-in uses customer_name + items.
"""
from decimal import Decimal
from typing import Sequence

from sqlalchemy.orm import Session

from app.models.order import PlayerOrder
from app.models.session import Session as SessionModel
from app.models.product import Product
from app.models.canteen_bill import CanteenBill, CanteenBillItem


def get_session_for_tenant(db: Session, session_id: int, tenant_id: int) -> SessionModel | None:
    return (
        db.query(SessionModel)
        .filter(SessionModel.id == session_id, SessionModel.tenant_id == tenant_id)
        .first()
    )


def create_order(
    db: Session,
    session_id: int,
    player_id: int,
    product_id: int,
    quantity: int,
    price: Decimal | None = None,
    tenant_id: int | None = None,
) -> PlayerOrder:
    """Create a player order. If price not given, use product price."""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise ValueError("Session not found")
    if tenant_id is not None and session.tenant_id != tenant_id:
        raise ValueError("Session not found")
    if session.status == "ended":
        raise ValueError("Cannot add order to ended session")
    from app.models.session import SessionPlayer

    player = db.query(SessionPlayer).filter(
        SessionPlayer.id == player_id,
        SessionPlayer.session_id == session_id,
    ).first()
    if not player:
        raise ValueError("Player not found in this session")
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ValueError("Product not found")
    if tenant_id is not None and product.tenant_id != tenant_id:
        raise ValueError("Product not found")
    unit_price = price if price is not None else product.price
    order = PlayerOrder(
        session_id=session_id,
        player_id=player_id,
        product_id=product_id,
        quantity=quantity,
        price=unit_price,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def create_walk_in_order(
    db: Session,
    customer_name: str,
    customer_mobile: str | None,
    items: list[dict],
    tenant_id: int,
) -> CanteenBill:
    """
    Create walk-in canteen order (no session/player).
    items: [{"product_id": int, "quantity": int}, ...]
    """
    if not items:
        raise ValueError("At least one item required")
    customer_name = (customer_name or "").strip()
    if not customer_name:
        raise ValueError("customer_name required")

    bill = CanteenBill(
        tenant_id=tenant_id,
        customer_name=customer_name,
        customer_mobile=(customer_mobile or "").strip() or None,
    )
    db.add(bill)
    db.flush()

    for it in items:
        product_id = it.get("product_id")
        quantity = it.get("quantity", 1)
        if product_id is None:
            raise ValueError("product_id required for each item")
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.tenant_id == tenant_id,
        ).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")
        item = CanteenBillItem(
            canteen_bill_id=bill.id,
            product_id=product_id,
            quantity=quantity,
            price=product.price,
        )
        db.add(item)

    db.commit()
    db.refresh(bill)
    return bill


def create_order_v2(
    db: Session,
    *,
    session_id: int | None = None,
    player_id: int | None = None,
    product_id: int | None = None,
    quantity: int = 1,
    price: Decimal | None = None,
    customer_name: str | None = None,
    customer_mobile: str | None = None,
    items: list[dict] | None = None,
    tenant_id: int,
):
    """
    Create order - player or walk-in.
    Returns (order_or_bill, type: "player" | "walk_in")
    """
    if session_id is not None and player_id is not None and product_id is not None:
        if price is None:
            product = db.query(Product).filter(
                Product.id == product_id,
                Product.tenant_id == tenant_id,
            ).first()
            if not product:
                raise ValueError("Product not found")
            price = product.price
        order = create_order(
            db, session_id, player_id, product_id, quantity, price, tenant_id
        )
        return order, "player"
    if customer_name and items:
        bill = create_walk_in_order(
            db, customer_name, customer_mobile, items, tenant_id
        )
        return bill, "walk_in"
    raise ValueError(
        "Provide (session_id, player_id, product_id, price) for player order "
        "OR (customer_name, items) for walk-in order"
    )


def list_orders_by_session(db: Session, session_id: int, tenant_id: int) -> Sequence[PlayerOrder]:
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        return []
    return list(session.orders)


def delete_order(db: Session, order_id: int, tenant_id: int) -> bool:
    """Delete player order; ensure order's session belongs to tenant."""
    order = db.query(PlayerOrder).filter(PlayerOrder.id == order_id).first()
    if not order:
        return False
    session = get_session_for_tenant(db, order.session_id, tenant_id)
    if not session:
        return False
    db.delete(order)
    db.commit()
    return True


def get_canteen_bill(db: Session, bill_id: int, tenant_id: int) -> CanteenBill | None:
    """Get canteen bill by id for tenant."""
    return (
        db.query(CanteenBill)
        .filter(CanteenBill.id == bill_id, CanteenBill.tenant_id == tenant_id)
        .first()
    )
