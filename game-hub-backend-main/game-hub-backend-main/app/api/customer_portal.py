"""
Customer portal API: signup, login, and table floor for customers.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_customer
from app.core.database import get_db
from app.models.customer import Customer
from app.models.tenant import Tenant
from app.schemas.common import SuccessResponse
from app.schemas.customer_auth import (
    CustomerAuthResponse,
    CustomerSignupRequest,
    CustomerLoginRequest,
    CustomerInfo,
    CustomerFloorResponse,
    CustomerStartSessionRequest,
    CustomerOrderRequest,
    CustomerCheckoutRequest,
)
from app.services.customer_auth_service import (
    register_customer,
    authenticate_customer,
    create_tokens_for_customer,
    get_default_customer_tenant,
)
from app.services.customer_portal_service import get_customer_floor
from app.services.customer_session_service import (
    customer_start_session,
    customer_get_session_detail,
    customer_add_order,
    customer_remove_order,
    customer_calculate_bill,
    customer_checkout_session,
    customer_list_products,
    customer_get_account,
)

router = APIRouter(prefix="/public/customer", tags=["Customer Portal"])


@router.get("/tenants", response_model=SuccessResponse[list[dict]])
def list_parlours(db: Session = Depends(get_db)):
    """List active parlours for customer signup/login picker."""
    tenants = (
        db.query(Tenant)
        .filter(Tenant.status == "active")
        .order_by(Tenant.name)
        .all()
    )
    return SuccessResponse(
        data=[{"id": t.id, "name": t.name} for t in tenants],
        message="OK",
    )


@router.get("/config", response_model=SuccessResponse[dict])
def portal_config(
    tenant_id: int | None = Query(None, ge=1),
    name: str | None = Query(None, min_length=1),
    db: Session = Depends(get_db),
):
    tenant = None
    if tenant_id is not None:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.status == "active").first()
    elif name:
        from sqlalchemy import func
        tenant = (
            db.query(Tenant)
            .filter(func.lower(Tenant.name) == name.strip().lower(), Tenant.status == "active")
            .first()
        )
    if not tenant:
        tenant = get_default_customer_tenant(db)
    if not tenant:
        raise HTTPException(status_code=404, detail="Parlour not found")
    return SuccessResponse(
        data={"tenant_id": tenant.id, "tenant_name": tenant.name},
        message="OK",
    )


@router.post("/signup", response_model=SuccessResponse[CustomerAuthResponse], status_code=201)
def customer_signup(body: CustomerSignupRequest, db: Session = Depends(get_db)):
    try:
        customer = register_customer(db, body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    tokens = create_tokens_for_customer(customer)
    return SuccessResponse(data=tokens, message="Account created")


@router.post("/login", response_model=SuccessResponse[CustomerAuthResponse])
def customer_login(body: CustomerLoginRequest, db: Session = Depends(get_db)):
    customer = authenticate_customer(db, body.mobile, body.password, body.tenant_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile or password",
        )
    tokens = create_tokens_for_customer(customer)
    return SuccessResponse(data=tokens, message="Login successful")


@router.get("/me", response_model=SuccessResponse[CustomerInfo])
def customer_me(current_customer: Customer = Depends(get_current_customer)):
    return SuccessResponse(
        data=CustomerInfo(
            id=current_customer.id,
            name=current_customer.name,
            mobile=current_customer.mobile,
            email=current_customer.email,
            tenant_id=current_customer.tenant_id,
        ),
        message="OK",
    )


@router.get("/tables", response_model=SuccessResponse[CustomerFloorResponse])
def customer_tables(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    floor = get_customer_floor(db, current_customer.tenant_id)
    return SuccessResponse(data=floor, message="OK")


@router.post("/sessions/start", response_model=SuccessResponse[dict], status_code=201)
def customer_start_table(
    body: CustomerStartSessionRequest,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    try:
        data = customer_start_session(
            db, current_customer, body.game_type_id, body.game_unit_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data=data, message="Table started")


@router.get("/sessions/{session_id}", response_model=SuccessResponse[dict])
def customer_get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    data = customer_get_session_detail(db, current_customer, session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    return SuccessResponse(data=data, message="OK")


@router.get("/products", response_model=SuccessResponse[list[dict]])
def customer_products(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    return SuccessResponse(data=customer_list_products(db, current_customer), message="OK")


@router.post("/orders", response_model=SuccessResponse[dict], status_code=201)
def customer_create_order(
    body: CustomerOrderRequest,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    try:
        data = customer_add_order(
            db,
            current_customer,
            body.session_id,
            body.product_id,
            body.quantity,
            body.player_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data=data, message="Order added")


@router.delete("/orders/{order_id}", response_model=SuccessResponse[dict])
def customer_delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    ok = customer_remove_order(db, current_customer, order_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Order not found")
    return SuccessResponse(data={}, message="Order removed")


@router.get("/sessions/{session_id}/bill", response_model=SuccessResponse[dict])
def customer_session_bill(
    session_id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    try:
        data = customer_calculate_bill(db, current_customer, session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data=data, message="OK")


@router.post("/sessions/{session_id}/checkout", response_model=SuccessResponse[dict])
def customer_session_checkout(
    session_id: int,
    body: CustomerCheckoutRequest,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    try:
        data = customer_checkout_session(
            db,
            current_customer,
            session_id,
            body.payment_method,
            vat_percent=body.vat_percent,
            discount_amount=body.discount_amount,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data=data, message="Session closed")


@router.get("/account", response_model=SuccessResponse[dict])
def customer_account(
    start_date: str | None = Query(None, description="YYYY-MM-DD"),
    end_date: str | None = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    from datetime import date as date_type

    start = date_type.fromisoformat(start_date) if start_date else None
    end = date_type.fromisoformat(end_date) if end_date else None
    data = customer_get_account(db, current_customer, start, end)
    if not data:
        raise HTTPException(status_code=404, detail="Account not found")
    return SuccessResponse(data=data, message="OK")
