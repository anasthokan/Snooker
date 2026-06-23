"""
Order service: create order, list by session, delete order.
"""
from decimal import Decimal
from typing import Sequence

from sqlalchemy.orm import Session

from app.models.order import PlayerOrder
from app.models.session import Session as SessionModel
from app.models.product import Product


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
    # Verify player belongs to session
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


def list_orders_by_session(db: Session, session_id: int, tenant_id: int) -> Sequence[PlayerOrder]:
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        return []
    return list(session.orders)


def delete_order(db: Session, order_id: int, tenant_id: int) -> bool:
    """Delete order; ensure order's session belongs to tenant."""
    order = db.query(PlayerOrder).filter(PlayerOrder.id == order_id).first()
    if not order:
        return False
    session = get_session_for_tenant(db, order.session_id, tenant_id)
    if not session:
        return False
    db.delete(order)
    db.commit()
    return True
