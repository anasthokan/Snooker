"""Repayments API: record outgoing business payments (rent, electricity, salary, etc.)."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import RequireCashier, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.repayment import RepaymentCreate, RepaymentResponse, RepaymentUpdate
from app.services.repayment_service import (
    create_repayment,
    delete_repayment,
    get_repayment,
    list_repayments,
    update_repayment,
)

router = APIRouter(prefix="/repayments", tags=["Bill Payments"], dependencies=[RequireCashier])


@router.post("", response_model=SuccessResponse[RepaymentResponse], status_code=201)
def post_repayment(
    body: RepaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        entry = create_repayment(db, body, current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SuccessResponse(data=RepaymentResponse.model_validate(entry), message="Bill payment recorded")


@router.get("", response_model=SuccessResponse[list[RepaymentResponse]])
def get_repayments(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    category: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        items = list_repayments(
            db,
            current_user.tenant_id,
            start_date=start_date,
            end_date=end_date,
            category=category,
            skip=skip,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SuccessResponse(data=[RepaymentResponse.model_validate(r) for r in items])


@router.get("/{repayment_id}", response_model=SuccessResponse[RepaymentResponse])
def get_one(
    repayment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = get_repayment(db, repayment_id, current_user.tenant_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Bill payment not found")
    return SuccessResponse(data=RepaymentResponse.model_validate(entry))


@router.patch("/{repayment_id}", response_model=SuccessResponse[RepaymentResponse])
def patch_repayment(
    repayment_id: int,
    body: RepaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = get_repayment(db, repayment_id, current_user.tenant_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Bill payment not found")
    try:
        entry = update_repayment(db, entry, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SuccessResponse(data=RepaymentResponse.model_validate(entry), message="Bill payment updated")


@router.delete("/{repayment_id}", response_model=SuccessResponse[None])
def remove_repayment(
    repayment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = get_repayment(db, repayment_id, current_user.tenant_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Bill payment not found")
    delete_repayment(db, entry)
    return SuccessResponse(data=None, message="Bill payment deleted")
