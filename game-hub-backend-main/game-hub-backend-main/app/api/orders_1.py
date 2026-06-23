"""
Orders API v1: optional session/player for canteen orders.
Supports player orders (session+player) and walk-in orders (customer_name+items).
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, RequireCashier
from app.core.database import get_db
from app.models.user import User
from app.schemas.billing import OrderCreateRequest, OrderResponse
from app.schemas.order_1 import (
    OrderCreateRequestV2,
    OrderResponseV2,
    CanteenOrderCreateRequest,
    CanteenBillResponse,
)
from app.schemas.common import SuccessResponse
from app.services.order_service import create_order, list_orders_by_session, delete_order
from app.services.order_service_1 import create_order_v2, create_walk_in_order
from app.services.billing_service_1 import calculate_canteen_only_bill

router = APIRouter(prefix="/orders", tags=["Orders v1"], dependencies=[RequireCashier])


@router.post("", response_model=SuccessResponse[OrderResponse], status_code=201)
def post_order(
    body: OrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create player order (session_id, player_id required). Original endpoint."""
    try:
        order = create_order(
            db,
            body.session_id,
            body.player_id,
            body.product_id,
            body.quantity,
            body.price,
            current_user.tenant_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data=OrderResponse.model_validate(order), message="Order created")


@router.post("/v2", response_model=SuccessResponse[dict], status_code=201)
def post_order_v2(
    body: OrderCreateRequestV2,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create canteen order - player OR walk-in.
    - Player: session_id, player_id, product_id, quantity, price
    - Walk-in: customer_name, customer_mobile, items: [{product_id, quantity}]
    """
    try:
        if body.session_id is not None and body.player_id is not None:
            order, _ = create_order_v2(
                db,
                session_id=body.session_id,
                player_id=body.player_id,
                product_id=body.product_id,
                quantity=body.quantity,
                price=body.price,
                tenant_id=current_user.tenant_id,
            )
            return SuccessResponse(
                data={
                    "type": "player",
                    "id": order.id,
                    "session_id": order.session_id,
                    "player_id": order.player_id,
                    "product_id": order.product_id,
                    "quantity": order.quantity,
                    "price": order.price,
                },
                message="Order created",
            )
        else:
            items = [{"product_id": i.product_id, "quantity": i.quantity} for i in (body.items or [])]
            bill = create_walk_in_order(
                db,
                body.customer_name or "",
                body.customer_mobile,
                items,
                current_user.tenant_id,
            )
            breakdown = calculate_canteen_only_bill(
                db, bill.id, current_user.tenant_id, vat_percent=Decimal("15")
            )
            return SuccessResponse(
                data={
                    "type": "walk_in",
                    "id": bill.id,
                    "canteen_bill_id": bill.id,
                    "customer_name": bill.customer_name,
                    "customer_mobile": bill.customer_mobile,
                    "items_count": len(bill.items),
                    "subtotal": breakdown["subtotal"],
                    "vat_amount": breakdown["vat_amount"],
                    "total": breakdown["total"],
                },
                message="Canteen order created",
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/canteen", response_model=SuccessResponse[CanteenBillResponse], status_code=201)
def post_canteen_order(
    body: CanteenOrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create walk-in canteen order (no session/player). Customer name + items."""
    try:
        items = [{"product_id": i.product_id, "quantity": i.quantity} for i in body.items]
        bill = create_walk_in_order(
            db,
            body.customer_name,
            body.customer_mobile,
            items,
            current_user.tenant_id,
        )
        breakdown = calculate_canteen_only_bill(
            db, bill.id, current_user.tenant_id, vat_percent=Decimal("15")
        )
        return SuccessResponse(
            data=CanteenBillResponse(
                id=bill.id,
                customer_name=bill.customer_name,
                customer_mobile=bill.customer_mobile,
                items_count=len(bill.items),
                subtotal=breakdown["subtotal"],
                vat_amount=breakdown["vat_amount"],
                total=breakdown["total"],
            ),
            message="Canteen order created",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{order_id}", response_model=SuccessResponse[dict])
def delete_one(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok = delete_order(db, order_id, current_user.tenant_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Order not found")
    return SuccessResponse(data={}, message="Order deleted")


@router.get("/session/{session_id}", response_model=SuccessResponse[list[OrderResponse]])
def get_orders_by_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    orders = list_orders_by_session(db, session_id, current_user.tenant_id)
    return SuccessResponse(data=[OrderResponse.model_validate(o) for o in orders])
