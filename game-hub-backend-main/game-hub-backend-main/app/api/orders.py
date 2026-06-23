"""Orders API (v2): uses billing schema (15% VAT default when calculating bill)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, RequireCashier
from app.core.database import get_db
from app.models.user import User
from app.schemas.billing import OrderCreateRequest, OrderResponse
from app.schemas.common import SuccessResponse
from app.services.order_service import create_order, list_orders_by_session, delete_order

router = APIRouter(prefix="/orders", tags=["Orders"], dependencies=[RequireCashier])


@router.post("", response_model=SuccessResponse[OrderResponse], status_code=201)
def post_order(
    body: OrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
