"""
Customer service: CRUD for customers (tenant-scoped).
"""
from typing import Sequence

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


def list_customers(
    db: Session,
    tenant_id: int,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Customer]:
    return (
        db.query(Customer)
        .filter(Customer.tenant_id == tenant_id)
        .order_by(Customer.name)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_customer(db: Session, customer_id: int, tenant_id: int) -> Customer | None:
    return (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.tenant_id == tenant_id)
        .first()
    )


def create_customer(db: Session, data: CustomerCreate, tenant_id: int) -> Customer:
    customer = Customer(
        tenant_id=tenant_id,
        name=data.name,
        mobile=data.mobile,
        email=data.email,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def update_customer(db: Session, customer: Customer, data: CustomerUpdate) -> Customer:
    if data.name is not None:
        customer.name = data.name
    if data.mobile is not None:
        customer.mobile = data.mobile
    if data.email is not None:
        customer.email = data.email
    db.commit()
    db.refresh(customer)
    return customer


def delete_customer(db: Session, customer_id: int, tenant_id: int) -> bool:
    customer = get_customer(db, customer_id, tenant_id)
    if not customer:
        return False
    db.delete(customer)
    db.commit()
    return True
