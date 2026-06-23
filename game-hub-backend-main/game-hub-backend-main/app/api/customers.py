"""
Customers API: CRUD for customers (tenant-scoped).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, RequireCashier
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from app.services.customer_service import (
    list_customers,
    get_customer,
    create_customer,
    update_customer,
    delete_customer,
)

router = APIRouter(prefix="/customers", tags=["Customers"], dependencies=[RequireCashier])


@router.post("", response_model=SuccessResponse[CustomerResponse], status_code=201)
def post_customer(
    body: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = create_customer(db, body, current_user.tenant_id)
    return SuccessResponse(data=CustomerResponse.model_validate(customer), message="Customer created")


@router.get("", response_model=SuccessResponse[list[CustomerResponse]])
def get_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = list_customers(db, current_user.tenant_id, skip=skip, limit=limit)
    return SuccessResponse(data=[CustomerResponse.model_validate(c) for c in items])


@router.get("/{customer_id}", response_model=SuccessResponse[CustomerResponse])
def get_one(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = get_customer(db, customer_id, current_user.tenant_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return SuccessResponse(data=CustomerResponse.model_validate(customer))


@router.patch("/{customer_id}", response_model=SuccessResponse[CustomerResponse])
def patch_customer(
    customer_id: int,
    body: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = get_customer(db, customer_id, current_user.tenant_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer = update_customer(db, customer, body)
    return SuccessResponse(data=CustomerResponse.model_validate(customer), message="Customer updated")


@router.delete("/{customer_id}", response_model=SuccessResponse[dict])
def delete_one(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok = delete_customer(db, customer_id, current_user.tenant_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Customer not found")
    return SuccessResponse(data={}, message="Customer deleted")
