"""
Customer account schemas: balance, daily report, settlement.
"""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class AccountBillItem(BaseModel):
    id: int
    session_id: int | None
    amount: Decimal
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountDailyEntry(BaseModel):
    date: str
    debit_total: Decimal
    credit_total: Decimal
    debits: list[AccountBillItem]
    credits: list[AccountBillItem]


class CustomerAccountSummary(BaseModel):
    customer_id: int
    name: str
    mobile: str | None
    balance: Decimal


class CustomerAccountDetail(BaseModel):
    customer_id: int
    customer_name: str
    mobile: str | None
    balance: Decimal
    total_debit: Decimal
    total_credit: Decimal
    daily_entries: list[AccountDailyEntry]


class SettleAccountRequest(BaseModel):
    amount: Decimal = Field(gt=0)
    notes: str | None = None
