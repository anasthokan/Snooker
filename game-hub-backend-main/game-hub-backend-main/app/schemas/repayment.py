"""Repayment schemas for outgoing business payments."""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class RepaymentCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)
    amount: Decimal = Field(..., gt=0)
    paid_at: date
    notes: str | None = None


class RepaymentUpdate(BaseModel):
    category: str | None = Field(None, min_length=1, max_length=50)
    amount: Decimal | None = Field(None, gt=0)
    paid_at: date | None = None
    notes: str | None = None


class RepaymentResponse(BaseModel):
    id: int
    tenant_id: int
    category: str
    amount: Decimal
    paid_at: date
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
