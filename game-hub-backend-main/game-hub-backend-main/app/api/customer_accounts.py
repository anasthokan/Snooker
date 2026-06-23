"""
Customer accounts API: search, balance, daily report, settlement.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, RequireCashier
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.customer_account import (
    CustomerAccountDetail,
    CustomerAccountSummary,
    SettleAccountRequest,
)
from app.services.customer_account_service import (
    get_account_detail,
    get_or_create_customer,
    parse_date_range,
    record_credit,
    search_customers_with_balance,
)
from app.services.customer_service import get_customer

router = APIRouter(prefix="/customers", tags=["Customer Accounts"], dependencies=[RequireCashier])


@router.get("/accounts/search", response_model=SuccessResponse[list[CustomerAccountSummary]])
def search_accounts(
    q: str | None = Query(None, description="Search by name, mobile, or customer ID"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    only_with_balance: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start_dt, end_dt = parse_date_range(start_date, end_date)
    rows = search_customers_with_balance(
        db,
        current_user.tenant_id,
        query=q,
        start=start_dt,
        end=end_dt,
        only_with_balance=only_with_balance,
    )
    return SuccessResponse(
        data=[
            CustomerAccountSummary(
                customer_id=r["customer_id"],
                name=r["name"],
                mobile=r["mobile"],
                balance=r["balance"],
            )
            for r in rows
        ]
    )


@router.get("/{customer_id}/account", response_model=SuccessResponse[CustomerAccountDetail])
def get_customer_account(
    customer_id: int,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start_dt, end_dt = parse_date_range(start_date, end_date)
    detail = get_account_detail(db, current_user.tenant_id, customer_id, start_dt, end_dt)
    if not detail:
        raise HTTPException(status_code=404, detail="Customer not found")
    return SuccessResponse(data=CustomerAccountDetail(**detail))


@router.post("/{customer_id}/settle", response_model=SuccessResponse[dict])
def settle_customer_account(
    customer_id: int,
    body: SettleAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = get_customer(db, customer_id, current_user.tenant_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    description = body.notes or f"Account settlement - {body.amount}"
    record_credit(db, current_user.tenant_id, customer_id, body.amount, description)
    db.commit()
    return SuccessResponse(data={}, message="Settlement recorded")
